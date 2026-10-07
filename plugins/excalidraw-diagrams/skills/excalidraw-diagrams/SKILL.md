---
name: excalidraw-diagrams
description: This skill should be used when the user asks to "create an Excalidraw diagram", "generate an .excalidraw file", "draw an architecture, network, or flow diagram", "make a diagram for the Obsidian vault", "redo or replace an Excalidraw diagram", "build a multi-frame diagram from a design doc", or says a diagram is "cramped", "too simple", or "missing details". Provides a tested Python generator with layout checks, an SVG preview, a facts cross-check against the source doc, and the style rules and lessons from building a 13-frame production platform diagram.
---

# Excalidraw diagrams from a source document

Generate `.excalidraw` scenes with a script, not by hand. The script sizes boxes from their text, binds arrows, and fails the build when the layout breaks. The diagram never holds a fact that its source document lacks.

Reference run: a 13-frame production platform diagram in an Obsidian vault, built from its design document.

## Workflow

1. **Write the goals first.** One file in the scratchpad: readers, the question each frame answers, checkable success criteria, non-goals, deliverables. Template in `references/design-rules.md`. Get the user's go before building.
2. **Fix the source of truth.** Update the design doc first. Every value on the diagram must exist in it. A value that is not decided gets a tag: proposed, to assign, open, user-verify. Never invent an address, port, count, or version to fill space.
3. **Write the frames.** Work in a scratch directory, never inside a repo. Copy `examples/example_frames.py` to `frames_a.py`. One function per frame: `f0(doc)`, `f1(doc)`, and so on. Use only the helpers in `scripts/xl.py` (its docstring lists them).
4. **Build.** From the scratch directory: `python3 <skill>/scripts/build.py frames_a,frames_b out.excalidraw`. Fix every ERROR and rebuild. The build exits 1 on errors but still writes the file.
5. **Look at every frame.** `<skill>/scripts/preview.sh out.excalidraw prev`, then Read each PNG in `prev/png`. Checks do not replace looking. Fix what is cramped, empty, or wrong.
6. **Cross-check and validate.** `python3 <skill>/scripts/crosscheck.py out.excalidraw source.md` lists facts the source lacks. `python3 <skill>/scripts/validate.py out.excalidraw` checks structure. Each leftover is either added to the source or removed from the diagram.
7. **Install.** Write the file to its final path. Update the embed and the frame table in the doc so the frame names match exactly. Move the old diagram to the vault `.trash/` with the reason in the filename (vault rule: never `rm`). Tell the user the generator ran once and later edits happen by hand in Obsidian.

## Frame recipe

```python
from xl import *

def f3(doc):
    f = doc.frame('3 Network and addressing')           # the name is the frame title
    f.header('Which VLAN holds what, and which addresses are public?')
    z = f.zone(60, 110, 1000, 100, 'DMZ tier', 'dmz')    # create the zone before its nodes
    a, b = f.row(80, 190, 40, [
        dict(w=300, tier='dmz', title='hpx01 .2', detail='active; terminates TLS', tag=PRO),
        dict(w=300, tier='dmz', title='hpx02 .3', detail='standby', tag=PRO)])
    f.zone_h(z, a.b + 30 - 110)                          # size the zone after the content
    f.horiz(a, b, label='VRRP')                          # gap must exceed the label width
    f.fit()                                              # frame height from content
    return f
```

Arrow kinds: `data` solid, `ctl` dashed blue, `plan` dotted grey, `drop` dashed red. Tags: `DEC PRO TOA OPN LAT PLN VER LIVE`.

## Rules that broke things

- **Text is its own element.** A rectangle with a `text` property renders a blank box. The helpers draw text as separate, grouped elements.
- **Never place text by hand.** The helpers wrap to the box width using a conservative glyph width (0.60 em sans, 0.62 em mono) and grow the box to fit. The checker rejects text that is too wide.
- **Frame-local coordinates.** Build every frame at the origin. `finalize()` moves frames into a two-column grid. Never mix global coordinates in.
- **Zones first, then nodes.** Creation order is z-order. Size zones afterwards with `zone_h`.
- **Arrow labels need room.** Width is about `chars x 9.6 + 12` px. Keep the gap wider than that plus 4 px, split long labels over two lines, or pick another segment with `label_at=i`.
- **Fan-out arrows must nest.** From one box to a row of boxes, run the outer arrows higher (smaller `mid`) so lines do not cross. Enter header boxes at `ob=0.8` so arrows miss the zone title.
- **Straight arrows.** Use `horiz` and `vert` for aligned boxes. For targets of other heights set `oa=(target.cy - a.y)/a.h`.
- **Tags are one line.** `text()` wraps a long tag and breaks the height math. Keep tags short.
- **Arrows are fixed polylines** (`elbowed: false`, bound at both ends). Moving a box later means fixing its arrow by hand.
- **Fill empty zone areas with notes from the source**, not with decoration.
- **Minimum font 16 px.** No dashes beyond the hyphen and no emoji in any label (user rule; the checker enforces it).
- **The preview is not Excalidraw.** `qlmanage` crops non-square SVG, so `render.py` pads to a square. ImageMagick failed on fonts and PIL is missing. Do not retry them.

## Style defaults

| Item | Value |
|---|---|
| Frame | 2400 px wide, two columns at x 0 and 2700, 300 px between rows, 60 px margins |
| Frame content | Question line at the top (24 px), one question per frame, readable alone |
| Text | Zone title 22, box title 20 sans, detail 16 mono, tags and arrow labels 16 sans |
| Colors | One per tier: ext, rtr, dmz, apps, data, k8s, sto, tool, phys, other, prod. A legend frame explains them |
| Strokes | Solid 3 for built things, dashed 2 for later phase or other environments |
| Status tags | decided green, proposed and to assign amber, open red, later phase grey |
| Frame 0 | Legend: tier colors, line styles, tags, how to read, source of truth path |

Details and the frame types that worked (overview, physical, network, firewall, NAT, ingress, platform, data, storage, monitoring, flows, failures) are in `references/design-rules.md`.

## Obsidian vault targets

Read the vault's own notes on Excalidraw first (look in its `CLAUDE.md` and any agent-docs folder). The plugin rewrites the file when it is opened, so re-read before any later edit. Follow the vault's `CLAUDE.md` for writing rules and for how to retire an old file.

## Resources

- `scripts/xl.py`: builder, layout checks, grid placement
- `scripts/build.py`: runs frame modules, checks, writes the scene
- `scripts/render.py`, `scripts/preview.sh`: SVG and PNG preview, tiles with `TILE=1300`
- `scripts/validate.py`: structure check (bindings, indices, frames, fonts)
- `scripts/crosscheck.py`: facts on the diagram versus the source doc
- `examples/example_frames.py`: two small frames that use every helper
- `references/scene-format.md`: element fields, bindings, plugin behavior
- `references/design-rules.md`: goals template, frame types, spacing, colors
- `references/lessons.md`: what went wrong in the reference run and the fix
