#!/usr/bin/env python3
"""Check that facts on a diagram exist in its source document.

Usage: crosscheck.py scene.excalidraw source.md

Pulls addresses, CIDRs, ports, VLAN ids, dates, versions, sizes, host names, rule and decision
ids out of every text element, then looks for each one in the source. Backticks are ignored, so
`.10`-`.12` matches .10-.12. Host names match the shorthand host-x-01/02/03. Anything left over
is printed. A leftover is either a fact the source lacks (fix the source or drop it from the
diagram) or a formatting variant a person must judge. Exit code 1 when tokens are left over.
"""
import json, re, sys

PATTERNS = [
    r'\d+\.\d+\.\d+\.\d+(?:/\d+)?(?:-\d+)?',      # addresses, CIDRs, ranges
    r'\b(?:tcp|udp) \d+(?:, (?:tcp|udp) \d+)*',     # ports
    r'\bVLAN \d+(?:-\d+)?', r'\b\d{4}-\d{4}\b',     # VLANs
    r'\b\d{4}-\d{2}-\d{2}\b',                       # dates
    r'\.\d{1,3}(?:-\.\d{1,3})?\b',                  # last-octet shorthand
    r'\b\d+(?:\.\d+)+(?:\.x)?\b',                   # versions
    r'\b\d+ ?(?:GiB|GB|TB|MB|vCPU|cores?)\b',       # sizes
    r'\b(?:rule|Rule) \d\b', r'\bD\d\b', r'\bS\d+\b',
]
HOST = re.compile(r'\b[a-z]+(?:-[a-z0-9]+)*-(\d+)\b')


def norm(s):
    return re.sub(r'\s+', ' ', s.replace('`', ''))


def main():
    scene = json.load(open(sys.argv[1]))
    src = norm(open(sys.argv[2]).read())
    frames = {e['id']: e['name'] for e in scene['elements'] if e['type'] == 'frame'}
    miss = {}
    for e in scene['elements']:
        if e['type'] != 'text':
            continue
        fn = frames.get(e.get('frameId'), '?')
        t = e['text'].replace('\n', ' ')
        for p in PATTERNS:
            for m in re.finditer(p, t):
                tok = norm(m.group(0)).strip()
                alts = {tok, tok.replace('tcp ', ''), tok.replace('rule ', '| ').replace('Rule ', '| ')}
                if not any(a in src for a in alts):
                    miss.setdefault(tok, set()).add(fn)
        for m in HOST.finditer(t):
            tok, num = m.group(0), m.group(1)
            base = tok[:-len(num)]
            shorthand = re.search(re.escape(base) + r'\d+(?:/\d+)+', src)
            ok = tok in src or (shorthand and any(num == n.lstrip('0').rjust(len(num), '0') or num == n
                                                  for n in re.findall(r'\d+', shorthand.group(0)[len(base):])))
            if not ok:
                miss.setdefault(tok, set()).add(fn)
    for k, v in sorted(miss.items()):
        print(f'{k!r:40} {sorted(v)[:3]}')
    print(len(miss), 'tokens not found in the source')
    sys.exit(1 if miss else 0)


main()
