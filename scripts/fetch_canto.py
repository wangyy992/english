#!/usr/bin/env python3
"""Cantonese listening pipeline (runs on GitHub Actions, not in the sandbox).

Mirrors scripts/fetch_lessons.py but for Cantonese broadcast/podcast feeds:
reads podcast RSS, downloads the newest episode audio onto the runner,
transcribes it with faster-whisper using Cantonese (language="yue") to get
sentence-level timestamps, and writes public/data/canto-lessons.json. As with
the English pipeline the audio is NOT redistributed — lessons point `audioUrl`
at the publisher's own enclosure URL, exactly like any podcast client.

STATUS / KNOWN RISKS (cannot be validated in the dev sandbox — no outbound
network to podcast CDNs, no whisper model):
  * FEED URLS below must be a real, working RTHK (or other) Cantonese podcast
    RSS with <enclosure> mp3 URLs. Verify the exact per-programme RSS URL and
    adjust `rss` before relying on this in CI.
  * Cantonese whisper ("yue") accuracy varies by model size; transcripts are
    best-effort and may need a larger model.
  * Confirm the source's terms allow linking audio + deriving transcripts,
    the same "audio not stored, attribution kept" basis as the English feeds.

Idempotent: episodes already in canto-lessons.json (by guid) are skipped.
"""

import json
import re
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
CANTO_JSON = REPO_ROOT / "public" / "data" / "canto-lessons.json"
# 被語言守門丟棄的 guid,持久化以免每日 cron 重複下載+轉寫同一集
SKIP_JSON = REPO_ROOT / "public" / "data" / "canto-skip.json"

KEEP_PER_FEED = 20
MAX_NEW_PER_RUN = 1
# 每課句數上限(整集播客過長時截為片段,避免幾百句的巨無霸)
MAX_SENTENCES = 80
# 語言守門:轉寫的中文字佔比低於此值視為英語/非粵語集數,丟棄
MIN_CJK_RATIO = 0.5
# Cantonese whisper model. "small" is a size/quality/runtime compromise for
# CPU runners; bump to "medium"/"large-v3" for better Cantonese if runtime allows.
WHISPER_MODEL = "small"

# Cantonese podcast feeds. The pipeline tries each in order; broken/empty
# feeds are skipped. Chatty Cantonese is a learner-oriented show with public
# transcripts (chattycantonese.com), so linking its enclosure audio + deriving
# our own sentence timestamps sits on the same basis as the English feeds.
# (Feed URLs can't be verified from the dev sandbox — no outbound network to
#  podcast hosts — so the first real test is the CI run.)
# Cantonese feeds. 語言守門會自動丟棄英語為主的集數,故混入的源也安全。
# RTHK Naked Cantonese 為教學向(英語偏多,可能被守門過濾);理想是純粵語原生
# 節目(如 RTHK 廣東話新聞/清談,或 Canto Be Like 等)。RSS URL 無法在沙盒
# 驗證,以 CI 首跑為準。
FEEDS: list[dict] = [
    {
        "prefix": "rthk-naked",
        "source": "RTHK Naked Cantonese",
        "source_url": "https://podcast.rthk.hk/podcast/item.php?pid=45",
        "rss": "https://podcast.rthk.hk/podcast/rss.php?pid=45&lang=zh-CN",
    },
]

# Browser-like UA: some podcast hosts (e.g. Buzzsprout) 403 unknown agents.
USER_AGENT = "Mozilla/5.0 (compatible; RobinPodcastFetcher/1.0; +https://github.com/wangyy992/english)"
# 中文句末標點:whisper 對粵語輸出書面中文,以此斷句。
SENTENCE_END = re.compile(r"[。!?！?…]+$")


def http_get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.read()


def parse_rss(xml_bytes: bytes):
    """Yield {title, audio_url, guid} for each item, newest first."""
    root = ET.fromstring(xml_bytes)
    for item in root.iter("item"):
        title_el = item.find("title")
        enclosure = item.find("enclosure")
        guid_el = item.find("guid")
        if title_el is None or enclosure is None:
            continue
        audio_url = enclosure.get("url")
        if not audio_url:
            continue
        title = (title_el.text or "").strip()
        guid = (guid_el.text or "").strip() if guid_el is not None else audio_url
        yield {"title": title, "audio_url": audio_url, "guid": guid}


def transcribe(audio_path: Path):
    """Sentence-level (start, end, text) segments via faster-whisper (Cantonese)."""
    from faster_whisper import WhisperModel

    model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    segments, _info = model.transcribe(str(audio_path), language="yue", vad_filter=True)

    sentences = []
    cur_text = ""
    cur_start = None
    last_end = 0.0
    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        if cur_start is None:
            cur_start = seg.start
        cur_text = f"{cur_text}{text}"
        last_end = seg.end
        # 中文較短:見句末標點或積累到一定長度即斷句
        if SENTENCE_END.search(cur_text) or len(cur_text) >= 30:
            sentences.append(
                {"start": round(cur_start, 2), "end": round(seg.end, 2), "text": cur_text}
            )
            cur_text = ""
            cur_start = None
    if cur_text and cur_start is not None:
        sentences.append({"start": round(cur_start, 2), "end": round(last_end, 2), "text": cur_text})
    return sentences


def slug(guid: str) -> str:
    return re.sub(r"[^a-zA-Z0-9]+", "", guid)[-16:] or str(int(time.time()))


def cjk_ratio(sentences) -> float:
    """轉寫中中文字佔非空白字符的比例(判斷是否粵語/中文集數)。"""
    text = "".join(s["text"] for s in sentences)
    cjk = sum(1 for c in text if "一" <= c <= "鿿")
    total = sum(1 for c in text if not c.isspace())
    return cjk / total if total else 0.0


def load_existing():
    if CANTO_JSON.exists():
        try:
            return json.loads(CANTO_JSON.read_text())
        except Exception:  # noqa: BLE001
            return []
    return []


def load_skip() -> set:
    if SKIP_JSON.exists():
        try:
            return set(json.loads(SKIP_JSON.read_text()))
        except Exception:  # noqa: BLE001
            return set()
    return set()


def main() -> int:
    existing = load_existing()
    skip = load_skip()
    known = {l.get("guid") for l in existing} | skip

    for feed in FEEDS:
        try:
            items = list(parse_rss(http_get(feed["rss"])))
        except Exception as e:  # noqa: BLE001 — one broken feed must not sink others
            print(f"[warn] feed {feed['source']} failed: {e}", file=sys.stderr)
            continue
        print(f"[info] {feed['source']}: {len(items)} items")

        new_items = [it for it in items if it["guid"] not in known][:MAX_NEW_PER_RUN]
        for it in new_items:
            lesson_id = f"{feed['prefix']}-{slug(it['guid'])}"
            print(f"[info] transcribing: {it['title']} ({it['audio_url']})")
            audio_path = Path(f"/tmp/{lesson_id}.mp3")
            try:
                audio_path.write_bytes(http_get(it["audio_url"], timeout=300))
                t0 = time.time()
                sentences = transcribe(audio_path)
                print(f"[info] whisper done in {time.time() - t0:.0f}s, {len(sentences)} sentences")
            except Exception as e:  # noqa: BLE001
                print(f"[warn] episode failed: {e}", file=sys.stderr)
                continue
            finally:
                audio_path.unlink(missing_ok=True)
            if len(sentences) < 5:
                print(f"[warn] too few sentences, skip {lesson_id}", file=sys.stderr)
                continue
            ratio = cjk_ratio(sentences)
            if ratio < MIN_CJK_RATIO:
                print(f"[warn] not Cantonese (CJK ratio {ratio:.2f}), skip {lesson_id}", file=sys.stderr)
                skip.add(it["guid"])  # 持久化,避免下次重抓同一集
                continue
            sentences = sentences[:MAX_SENTENCES]
            existing.insert(
                0,
                {
                    "id": lesson_id,
                    "type": "live",
                    "guid": it["guid"],
                    "source": feed["source"],
                    "sourceUrl": feed.get("source_url", ""),
                    "title": it["title"] or "RTHK 節目",
                    "audioUrl": it["audio_url"],
                    "sentences": sentences,
                },
            )
            known.add(it["guid"])

    # 每源保留最新 N 集
    by_prefix: dict[str, int] = {}
    kept = []
    for l in existing:
        p = l["id"].rsplit("-", 1)[0]
        by_prefix[p] = by_prefix.get(p, 0) + 1
        if by_prefix[p] <= KEEP_PER_FEED:
            kept.append(l)

    CANTO_JSON.parent.mkdir(parents=True, exist_ok=True)
    CANTO_JSON.write_text(json.dumps(kept, ensure_ascii=False, indent=1))
    SKIP_JSON.write_text(json.dumps(sorted(skip), ensure_ascii=False))
    print(f"[info] wrote {len(kept)} canto lessons, {len(skip)} skipped guids")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
