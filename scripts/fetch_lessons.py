#!/usr/bin/env python3
"""Daily listening-material pipeline (runs on GitHub Actions).

Reads official podcast RSS feeds for learner-oriented English programmes,
downloads the newest episode audio onto the runner, transcribes it with
faster-whisper to get sentence-level timestamps, and writes lesson JSON to
public/data/lessons.json. The audio itself is NOT redistributed: lessons
point `audioUrl` at the publisher's own CDN enclosure URL, exactly like any
podcast client would.

Idempotent: episodes already present in lessons.json are skipped, so the
daily run only does whisper work when a feed has something new.
"""

import json
import re
import sys
import time
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
LESSONS_JSON = REPO_ROOT / "public" / "data" / "lessons.json"

# Newest-first cap on how many lessons we keep per feed in lessons.json.
KEEP_PER_FEED = 40
# How many not-yet-fetched episodes to transcribe per feed per run (bounds
# runtime). Feeds are processed newest-first, so beyond keeping up with new
# releases this steadily backfills the archive a few episodes per day.
MAX_NEW_PER_RUN = 5

# Each feed may define start/end trim markers (case-insensitive regex).
# Podcast episodes carry injected ads before and after the actual programme;
# we keep only the sentences from the first start_marker match through the
# last end_marker match. If a marker isn't found, that side is left untrimmed.
FEEDS = [
    {
        "prefix": "bbc-6min",
        "source": "BBC 6 Minute English",
        "rss": "https://podcasts.files.bbci.co.uk/p02pc9tn.rss",
        "level": 2,
        "start_marker": r"minute english from bbc learning english",
        "end_marker": r"bbclearningenglish\.com",
    },
    {
        "prefix": "bbc-tews",
        "source": "BBC The English We Speak",
        "rss": "https://podcasts.files.bbci.co.uk/p02pc9zn.rss",
        "level": 1,
        "start_marker": r"english we speak",
        "end_marker": r"bbclearningenglish\.com|goodbye|bye[.!\s]*$",
    },
]

USER_AGENT = "siji-lesson-fetcher/1.0 (personal English-learning PWA)"

SENTENCE_END = re.compile(r"[.!?…]['\"”’)]*\s*$")


def http_get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.read()


def slugify(text: str, max_len: int = 48) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:max_len].rstrip("-") or "episode"


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
    """Sentence-level (start, end, text) segments via faster-whisper."""
    from faster_whisper import WhisperModel

    model = WhisperModel("small.en", device="cpu", compute_type="int8")
    segments, _info = model.transcribe(str(audio_path), vad_filter=True)

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
        cur_text = f"{cur_text} {text}".strip()
        last_end = seg.end
        if SENTENCE_END.search(cur_text) and len(cur_text) >= 20:
            sentences.append(
                {"start": round(cur_start, 2), "end": round(seg.end, 2), "text": cur_text}
            )
            cur_text = ""
            cur_start = None
    if cur_text and cur_start is not None:
        sentences.append({"start": round(cur_start, 2), "end": round(last_end, 2), "text": cur_text})
    return sentences


def trim_to_programme(sentences, start_marker: str | None, end_marker: str | None):
    """Cut injected podcast ads: keep first start_marker match → last end_marker match."""
    first = 0
    last = len(sentences) - 1
    if start_marker:
        pat = re.compile(start_marker, re.IGNORECASE)
        for i, s in enumerate(sentences):
            if pat.search(s["text"]):
                first = i
                break
    if end_marker:
        pat = re.compile(end_marker, re.IGNORECASE)
        for i in range(len(sentences) - 1, -1, -1):
            if pat.search(sentences[i]["text"]):
                last = i
                break
    return sentences[first : last + 1]


def load_existing():
    if LESSONS_JSON.exists():
        return json.loads(LESSONS_JSON.read_text())
    return []


def main() -> int:
    existing = load_existing()
    known_guids = {l.get("guid") for l in existing}
    changed = False

    for feed in FEEDS:
        try:
            items = list(parse_rss(http_get(feed["rss"])))
        except Exception as e:  # noqa: BLE001 — a broken feed must not sink the others
            print(f"[warn] feed {feed['source']} failed: {e}", file=sys.stderr)
            continue
        print(f"[info] {feed['source']}: {len(items)} items in feed")

        new_items = [it for it in items if it["guid"] not in known_guids][:MAX_NEW_PER_RUN]
        for it in new_items:
            lesson_id = f"{feed['prefix']}-{slugify(it['title'])}"
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
            sentences = trim_to_programme(
                sentences, feed.get("start_marker"), feed.get("end_marker")
            )
            if len(sentences) < 5:
                print(f"[warn] too few sentences, skipping {lesson_id}", file=sys.stderr)
                continue
            existing.insert(
                0,
                {
                    "id": lesson_id,
                    "guid": it["guid"],
                    "source": feed["source"],
                    "title": it["title"],
                    "level": feed["level"],
                    # https upgrade: the app is served over https, so an
                    # http:// enclosure would be blocked as mixed content.
                    "audioUrl": re.sub(r"^http://", "https://", it["audio_url"]),
                    "sentences": sentences,
                    "addedAt": int(time.time() * 1000),
                },
            )
            known_guids.add(it["guid"])
            changed = True

    # Per-feed cap, newest first.
    if changed:
        kept = []
        counts: dict[str, int] = {}
        for lesson in sorted(existing, key=lambda l: l.get("addedAt", 0), reverse=True):
            src = lesson.get("source", "?")
            if counts.get(src, 0) < KEEP_PER_FEED:
                kept.append(lesson)
                counts[src] = counts.get(src, 0) + 1
        LESSONS_JSON.parent.mkdir(parents=True, exist_ok=True)
        LESSONS_JSON.write_text(json.dumps(kept, ensure_ascii=False, indent=1))
        print(f"[info] wrote {len(kept)} lessons to {LESSONS_JSON}")
    else:
        print("[info] no new episodes")

    return 0


if __name__ == "__main__":
    sys.exit(main())
