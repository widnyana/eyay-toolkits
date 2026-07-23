#!/usr/bin/env python3
"""Merge a batch of proverbs into references/proverbs.md, skipping duplicates.

Usage:
    merge_proverbs.py <batch-file>            # merge batch into the corpus
    merge_proverbs.py --dry-run <batch-file>  # report only, do not write

The corpus lives at ../references/proverbs.md relative to this script.
Batch format: one "Proverb: Meaning" per line (splits on the first ": ").

Dedup key = lowercased proverb with punctuation and extra whitespace removed,
so "Ada gula, ada semut" and "Ada gula ada semut" are treated as the same
proverb. This catches corpus duplicates, intra-batch duplicates, and
punctuation/spacing variants. It does NOT catch word-swap near-variants
("Tak ada rotan" vs "Tiada rotan"); the run report prints every NEW entry so
those can be hand-pruned before committing.

Existing entries are kept in their original order; new entries are appended
to the end of their section (sorted among themselves). The diff is therefore
purely additive — no existing line ever moves.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
CORPUS = SCRIPT_DIR / ".." / "references" / "proverbs.md"

BULLET_RE = re.compile(r"^- \*\*(?P<prov>.+?)\*\* — (?P<mean>.+)$")
_NON_KEY_CHARS = re.compile(r"[,.!?;:\"'()`]")


def norm_key(proverb: str) -> str:
    """Normalize a proverb into a dedup key."""
    s = proverb.lower()
    s = _NON_KEY_CHARS.sub(" ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def main(argv: list[str]) -> int:
    dry_run = False
    args = argv[1:]
    if args and args[0] == "--dry-run":
        dry_run = True
        args = args[1:]
    if len(args) != 1:
        sys.stderr.write("usage: merge_proverbs.py [--dry-run] <batch-file>\n")
        return 2

    batch_path = Path(args[0])
    corpus_path = CORPUS.resolve()
    if not corpus_path.is_file():
        sys.stderr.write(f"corpus not found: {corpus_path}\n")
        return 2

    corpus_text = corpus_path.read_text(encoding="utf-8")
    corpus_lines = corpus_text.splitlines()

    # Split header (everything up to first '## ' section).
    header: list[str] = []
    idx = 0
    while idx < len(corpus_lines) and not corpus_lines[idx].startswith("## "):
        header.append(corpus_lines[idx])
        idx += 1

    # Parse existing sections: letter -> list of (proverb, meaning, raw_line).
    sections: dict[str, list[tuple[str, str, str]]] = {}
    existing_keys: dict[str, str] = {}  # norm_key -> proverb (for dup report)
    cur = None
    for line in corpus_lines[idx:]:
        if line.startswith("## "):
            cur = line[3:].strip()[:1].upper()
            sections.setdefault(cur, [])
        elif line.startswith("- **") and cur is not None:
            m = BULLET_RE.match(line)
            if m:
                prov, mean = m.group("prov"), m.group("mean")
                sections[cur].append((prov, mean, line))
                existing_keys.setdefault(norm_key(prov), prov)

    # Parse batch.
    new_entries: list[tuple[str, str, str]] = []  # (letter, prov, meaning)
    dup_corpus: list[str] = []
    dup_batch: list[str] = []
    seen_this_run: set[str] = set()

    for raw in batch_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        if ": " not in line:
            sys.stderr.write(f"skip (no ': '): {line[:60]}\n")
            continue
        prov, meaning = line.split(": ", 1)
        prov = prov.strip()
        meaning = meaning.strip()
        key = norm_key(prov)
        if key in existing_keys:
            dup_corpus.append(f"{prov}  [= {existing_keys[key]}]")
            continue
        if key in seen_this_run:
            dup_batch.append(prov)
            continue
        seen_this_run.add(key)
        letter = prov[:1].upper()
        new_entries.append((letter, prov, meaning))

    # Print report.
    report = ["", "=== MERGE REPORT ===", f"NEW:              {len(new_entries)}",
              f"DUPE (in corpus): {len(dup_corpus)}",
              f"DUPE (in batch):  {len(dup_batch)}", "",
              "--- NEW entries (by section) ---"]
    by_section: dict[str, list[tuple[str, str]]] = {}
    for letter, prov, meaning in new_entries:
        by_section.setdefault(letter, []).append((prov, meaning))
    for letter in sorted(by_section):
        report.append(f"\n## {letter}")
        for prov, meaning in by_section[letter]:
            report.append(f"  + {prov}  —  {meaning}")
    if dup_corpus:
        report.append("\n--- skipped (already in corpus) ---")
        for d in dup_corpus:
            report.append(f"  - {d}")
    if dup_batch:
        report.append("\n--- skipped (duplicate within batch) ---")
        for d in dup_batch:
            report.append(f"  - {d}")
    sys.stderr.write("\n".join(report) + "\n")

    if dry_run:
        sys.stderr.write("\n(dry-run: no file written)\n")
        return 0

    # Merge: preserve existing entries in their original order (existing items
    # carry a non-empty `raw`; new items have raw=""), then APPEND the new
    # entries for each section, sorted alphabetically among themselves. This
    # keeps the diff purely additive — existing lines never move.
    for letter, prov, meaning in new_entries:
        sections.setdefault(letter, []).append((prov, meaning, ""))

    out: list[str] = []
    out.extend(header)
    for letter in sorted(sections):
        existing = [it for it in sections[letter] if it[2]]
        added = sorted(
            (it for it in sections[letter] if not it[2]),
            key=lambda t: norm_key(t[0]),
        )
        out.append("")
        out.append(f"## {letter}")
        out.append("")
        for prov, meaning, raw in existing + added:
            out.append(f"- **{prov}** — {meaning}")

    corpus_path.write_text("\n".join(out) + "\n", encoding="utf-8")
    sys.stderr.write(f"\nwrote {len(new_entries)} new entries to {corpus_path}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
