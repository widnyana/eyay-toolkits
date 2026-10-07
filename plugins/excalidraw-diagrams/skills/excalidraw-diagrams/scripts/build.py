#!/usr/bin/env python3
"""Build a scene from frame modules.

Usage (run from the directory that holds the frame modules):
  python3 <skill>/scripts/build.py frames_a,frames_b out.excalidraw

Each module defines functions f0(doc), f1(doc), ... that return a frame. They run in numeric
order across modules. The layout checks run before the file is written. Exit code 1 when a
check fails; the file is still written so it can be rendered and inspected.
"""
import sys, os, json, re, importlib
here = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, here)
sys.path.insert(0, os.getcwd())
from xl import Doc, check, finalize

if len(sys.argv) < 3:
    sys.exit(__doc__)
mods, out = sys.argv[1].split(','), sys.argv[2]
doc = Doc()
for m in mods:
    mod = importlib.import_module(m)
    names = sorted((n for n in dir(mod) if re.fullmatch(r'f\d+', n)), key=lambda n: int(n[1:]))
    for n in names:
        getattr(mod, n)(doc)
errs = check(doc)
for e in errs:
    print('ERROR', e)
json.dump(finalize(doc), open(out, 'w'), indent=2, ensure_ascii=False)
print(f'{len(doc.frames)} frames, {len(doc.els)} elements, {len(errs)} errors -> {out}')
sys.exit(1 if errs else 0)
