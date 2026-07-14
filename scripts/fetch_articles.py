#!/usr/bin/env python3
"""Daily reading-material pipeline (runs on GitHub Actions).

Pulls recent articles from The Conversation's official Atom feeds. Their
content is published under CC BY-ND 4.0, which explicitly permits verbatim
republication with attribution — each stored article keeps its source name
and canonical URL, which the app displays.

Output: public/data/articles.json, newest first, capped.
"""

import json
import re
import sys
import time
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ARTICLES_JSON = REPO_ROOT / "public" / "data" / "articles.json"

KEEP_TOTAL = 30
MAX_NEW_PER_RUN = 3
MIN_PARAGRAPHS = 5
MAX_PARAGRAPHS = 24

# Candidate feeds, first reachable one wins per source.
SOURCES = [
    {
        "name": "The Conversation",
        "level": "C1",
        "feeds": [
            "https://theconversation.com/us/articles.atom",
            "https://theconversation.com/global/articles.atom",
            "https://theconversation.com/articles.atom",
        ],
    },
]

USER_AGENT = "siji-article-fetcher/1.0 (personal English-learning PWA)"
ATOM = "{http://www.w3.org/2005/Atom}"


def http_get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.read()


def slugify(text: str, max_len: int = 60) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:max_len].rstrip("-") or "article"


class ParagraphExtractor(HTMLParser):
    """Collects text of top-level <p> elements, skipping figures/captions."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.paragraphs: list[str] = []
        self._p_depth = 0
        self._skip_depth = 0
        self._buf: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag in ("figure", "figcaption", "aside", "blockquote"):
            self._skip_depth += 1
        elif tag == "p" and self._skip_depth == 0:
            self._p_depth += 1

    def handle_endtag(self, tag):
        if tag in ("figure", "figcaption", "aside", "blockquote"):
            self._skip_depth = max(0, self._skip_depth - 1)
        elif tag == "p" and self._p_depth > 0:
            self._p_depth -= 1
            text = re.sub(r"\s+", " ", "".join(self._buf)).strip()
            self._buf = []
            if text:
                self.paragraphs.append(text)

    def handle_data(self, data):
        if self._p_depth > 0 and self._skip_depth == 0:
            self._buf.append(data)


def extract_paragraphs(html: str) -> list[str]:
    parser = ParagraphExtractor()
    parser.feed(html)
    paragraphs = parser.paragraphs
    # Drop boilerplate footers the feed appends ("This article is republished…").
    cleaned = [
        p
        for p in paragraphs
        if not re.search(r"republished from|read the original article|receives funding|disclosure statement", p, re.I)
    ]
    return cleaned[:MAX_PARAGRAPHS]


def parse_atom(xml_bytes: bytes):
    root = ET.fromstring(xml_bytes)
    for entry in root.iter(f"{ATOM}entry"):
        title_el = entry.find(f"{ATOM}title")
        content_el = entry.find(f"{ATOM}content")
        id_el = entry.find(f"{ATOM}id")
        link_url = None
        for link in entry.findall(f"{ATOM}link"):
            if link.get("rel") in (None, "alternate"):
                link_url = link.get("href")
                break
        if title_el is None or content_el is None:
            continue
        yield {
            "title": (title_el.text or "").strip(),
            "html": content_el.text or "",
            "guid": (id_el.text or "").strip() if id_el is not None else (link_url or ""),
            "url": link_url or "",
        }


def load_existing():
    if ARTICLES_JSON.exists():
        return json.loads(ARTICLES_JSON.read_text())
    return []


def main() -> int:
    existing = load_existing()
    known_guids = {a.get("guid") for a in existing}
    changed = False

    for source in SOURCES:
        entries = None
        for feed_url in source["feeds"]:
            try:
                entries = list(parse_atom(http_get(feed_url)))
                print(f"[info] {source['name']}: {len(entries)} entries via {feed_url}")
                break
            except Exception as e:  # noqa: BLE001
                print(f"[warn] feed {feed_url} failed: {e}", file=sys.stderr)
        if not entries:
            continue

        added = 0
        for entry in entries:
            if added >= MAX_NEW_PER_RUN:
                break
            if entry["guid"] in known_guids or not entry["title"]:
                continue
            paragraphs = extract_paragraphs(entry["html"])
            if len(paragraphs) < MIN_PARAGRAPHS:
                print(f"[warn] too little text, skipping: {entry['title']}", file=sys.stderr)
                continue
            existing.insert(
                0,
                {
                    "id": f"tc-{slugify(entry['title'])}",
                    "guid": entry["guid"],
                    "title": entry["title"],
                    "level": source["level"],
                    "topic": source["name"],
                    "paragraphs": paragraphs,
                    "sourceName": f"{source['name']} (CC BY-ND 4.0)",
                    "sourceUrl": entry["url"],
                    "addedAt": int(time.time() * 1000),
                },
            )
            known_guids.add(entry["guid"])
            added += 1
            changed = True
            print(f"[info] added: {entry['title']} ({len(paragraphs)} paragraphs)")

    if changed:
        kept = sorted(existing, key=lambda a: a.get("addedAt", 0), reverse=True)[:KEEP_TOTAL]
        ARTICLES_JSON.parent.mkdir(parents=True, exist_ok=True)
        ARTICLES_JSON.write_text(json.dumps(kept, ensure_ascii=False, indent=1))
        print(f"[info] wrote {len(kept)} articles to {ARTICLES_JSON}")
    else:
        print("[info] no new articles")

    return 0


if __name__ == "__main__":
    sys.exit(main())
