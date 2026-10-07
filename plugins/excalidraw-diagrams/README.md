# excalidraw-diagrams

Generate multi-frame `.excalidraw` diagrams from a design document with a script instead of by hand. The builder sizes boxes from their text, binds arrows, and fails the build when the layout breaks. A cross-check lists every address, port, version, and host name on the diagram that the source document does not contain.

## Skill

### excalidraw-diagrams

Triggers on requests such as "create an Excalidraw diagram", "draw an architecture or network diagram", "make a diagram for the Obsidian vault", "redo this diagram", or a diagram described as cramped, too simple, or missing details.

Workflow the skill enforces:

1. Write a goals file: one question per frame, checkable success criteria, non-goals.
2. Update the source document first. The diagram never adds a fact the document lacks. Values not decided yet are tagged proposed, to assign, open, or user-verify.
3. Write frame functions against the helpers in `scripts/xl.py` (zones, nodes, rows, bound arrows, tables, status tags).
4. Build. The build fails on overlapping boxes, text that does not fit, arrows that cross unrelated boxes, labels that hit boxes, fonts under 16 px, and dashes or emoji in labels.
5. Preview every frame as a PNG and look at it.
6. Run the structure validator and the facts cross-check.
7. Install the file, update the embed and the frame table in the document, retire the old diagram.

## Requirements

- Python 3.9 or newer, standard library only
- macOS for the PNG preview (`qlmanage`). Build, validate, and cross-check run anywhere

## Install

```
/plugin install excalidraw-diagrams@eyay-toolkits
```

## Files

```
skills/excalidraw-diagrams/
  SKILL.md                    workflow, rules that broke things, style defaults
  scripts/xl.py               builder, layout checks, grid placement
  scripts/build.py            runs frame modules, checks, writes the scene
  scripts/render.py           SVG preview (an approximation, not Excalidraw)
  scripts/preview.sh          SVG to PNG, whole frames or zoomed tiles
  scripts/validate.py         bindings, indices, frame membership, fonts
  scripts/crosscheck.py       facts on the diagram versus the source document
  examples/example_frames.py  two small frames that use every helper
  references/                 scene format, design rules, lessons learned
```

## Try it

```bash
mkdir work && cd work
cp <plugin>/skills/excalidraw-diagrams/examples/example_frames.py frames_a.py
python3 <plugin>/skills/excalidraw-diagrams/scripts/build.py frames_a out.excalidraw
python3 <plugin>/skills/excalidraw-diagrams/scripts/validate.py out.excalidraw
<plugin>/skills/excalidraw-diagrams/scripts/preview.sh out.excalidraw prev
```

Expected: `2 frames, 73 elements, 0 errors`, then a validator line with `errors 0`, then two PNG files in `prev/png`.

## Notes

- The generator is meant to run once per diagram. Later edits happen by hand in Excalidraw, because the Obsidian plugin rewrites ids when it opens the file and a re-run would overwrite those edits.
- Arrows are fixed polylines. Moving a box later means adjusting its arrow by hand.
- Layout checks use a conservative glyph width. The final look in Obsidian is a human check.
