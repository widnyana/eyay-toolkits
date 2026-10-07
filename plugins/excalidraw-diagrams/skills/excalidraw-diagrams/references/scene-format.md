# Scene format notes

Facts used by `scripts/xl.py`. Verified items come from a working diagram in an Obsidian vault
and from the reference run. Items marked
unverified were not seen in Obsidian.

## File

```json
{"type": "excalidraw", "version": 2,
 "source": "https://github.com/zsviczian/obsidian-excalidraw-plugin/releases/tag/2.26.4",
 "elements": [], "appState": {"gridSize": null, "viewBackgroundColor": "#ffffff"}, "files": {}}
```

A plain `.excalidraw` file is raw JSON. Pretty-printed JSON is fine (the plugin rewrites it that way).

## Element base fields

`id, type, x, y, width, height, angle, strokeColor, backgroundColor, fillStyle, strokeWidth,
strokeStyle (solid|dashed|dotted), roughness, opacity, groupIds, frameId, roundness, seed,
version, versionNonce, isDeleted, boundElements, updated, link, locked, index`.

- `roughness: 0` gives clean lines. `roundness: {"type": 3}` rounds rectangle corners.
- `index` is a fractional index. Valid and ascending: `a0..az` (62 values), then `b00..bzz`. Order is digits, then upper case, then lower case. The array order and the index order must agree.
- Children carry `frameId`. The frame element comes before its children.
- A node and its texts share one `groupIds` entry, so they move together.

## Text

Fields: `text, originalText, fontSize, fontFamily, textAlign, verticalAlign, containerId, autoResize, lineHeight`.

- `fontFamily` 2 (Helvetica) for labels and 3 (Cascadia) for mono. Widths are estimated, not measured.
- Pre-wrap lines with `\n`, set `autoResize: false`, fix `width`, set `lineHeight: 1.25`. Height is `lines x fontSize x 1.25`.
- Standalone text sits over its shape at matching coordinates. Do not give a rectangle a `text` property (blank box).
- An arrow label is a text element with `containerId` set to the arrow id. The arrow lists it in `boundElements`. Unverified: the label background that masks the line in Obsidian.

## Frame

`type: "frame"`, `name` is the visible title. No separate title text is needed.

## Arrow

```json
{"type": "arrow", "points": [[0,0],[0,109],[120,109],[120,218]],
 "startBinding": {"elementId": "<id>", "mode": "orbit", "fixedPoint": [0.4, 0.6]},
 "endBinding":   {"elementId": "<id>", "mode": "orbit", "fixedPoint": [0.26, 0.26]},
 "startArrowhead": null, "endArrowhead": "triangle", "elbowed": false, "lastCommittedPoint": null}
```

- `points` are relative to the arrow's `x, y` (the first point is `[0,0]`).
- `fixedPoint` is a 0 to 1 ratio inside the target's bounding box, not a coordinate.
- Both bound shapes list the arrow in their `boundElements` as `{"type": "arrow", "id": ...}`.
- Keep segments axis-aligned. A two-point arrow between distant shapes draws a diagonal that appears to connect whatever it crosses.
- `elbowed: true` lets Excalidraw reroute on edit, and it may also reroute on load. This skill uses `false` so the checked route is the drawn route.

## Obsidian plugin behavior

- Opening or touching the file rewrites it: ids, whitespace, and extra fields change. Re-read before any later edit.
- Hand-chosen ids are replaced by random ones.
- A frame `name` renders as its title above the frame, at screen size, so it stays readable when zoomed out.
- The embed in a note is `![[path/to/file.excalidraw]]` with the vault's absolute link format.
