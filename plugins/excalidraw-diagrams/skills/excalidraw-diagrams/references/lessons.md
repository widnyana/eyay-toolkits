# Lessons from the reference run

Source: building a production platform diagram (13 frames, about 1000 elements) from its design doc, replacing a hand-written 6-frame diagram.

## What the user complained about

The old diagram was "too cramped, overly simple, missing details". Cause: six frames stacked in one narrow column, text at 10 to 14 px, no legend, and facts that the design doc had since changed. Fix: 13 frames with one question each, a two-column grid, 16 px minimum text, a legend frame, and a rebuilt design doc first.

## Process lessons

1. **Goals file before drawing.** The success criteria became the build gate. The user approved them with one command.
2. **Doc first.** The diagram needed host addresses, ports, a failure table, and an open design point. They went into the doc, tagged proposed or open, before the diagram used them.
3. **Every claim needs proof.** The user said so after a first plan relied on memory. Several diagram lines were dropped because the doc did not state them: a NIC count, a DRS remark, a named certificate authority, a quarterly drill that only lived in a plan file. Run `crosscheck.py`, then either add the fact to the doc or delete it.
4. **Look at the pictures.** The first build passed all checks and still needed changes: a label sat on the line it labeled, one zone was half empty, one arrow route was ugly. Read each PNG.
5. **Generate once.** After install, edits happen in Obsidian. A re-run would overwrite them.

## Layout lessons

- Equal-height rows (`row`, `rowx`) make straight arrows possible. Without them arrows jog.
- A label on a 30 px gap hits both boxes. Widen the gap or drop the label.
- One tall node (for example a shared destination) lets each row aim a straight arrow at it with `ob=(row.cy - node.y)/node.h`.
- Two arrows between the same pair of boxes (request and response) need different anchors and different `mid` values. The arrow that returns runs higher, or the paths cross.
- A bus (one source, many targets) looks better than many parallel runs. Use the same `mid` for all.
- When a node must sit beside a zone title, the arrow enters at `ob=0.8`, away from the title text.
- Put the legend first. Readers decode colors once.

## Tooling lessons

- ImageMagick `magick` could not render SVG text here (no font). PIL was not installed. `qlmanage -t -s 2400 -o out file.svg` works on macOS but crops a non-square SVG, so the renderer pads to a square canvas.
- Do not trust the preview for fonts or label backgrounds. It is a layout check.
- Read the vault's own notes on Excalidraw before touching a vault diagram. They list the failure modes of hand-written scenes.
- Run Python with `-I` only when reading untrusted files. `build.py` adds its own directory and the current directory to the path, so it works with or without `-I`.

## Mistakes to avoid next time

- Writing the diagram's host names before the doc names them.
- Writing a tag longer than the box. It wraps and the node height is then wrong.
- Letting a zone be sized before its content exists. Create the zone first, size it after.
- Matching the doc's numbers by eye. Run the script.
- Editing the doc and the diagram out of order. The frame table in the doc must match the frame names exactly.
