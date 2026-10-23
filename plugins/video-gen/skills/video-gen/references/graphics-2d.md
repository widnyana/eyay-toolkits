# 2D graphics: Cairo, Skia, Poppler

Title cards, lower thirds, vector shapes, text, PDF slides. Output: PNG stills or a PNG
sequence for `ffmpeg-compose.md`.

| Need | Tool |
|---|---|
| Vector shapes, text, simple animation (default) | Cairo (`pycairo`) |
| Many frames, heavy paths, or Skia already used in fframes | Skia (`skia-python`) |
| PDF slides or pages to frames | Poppler (`pdftocairo`) |

## Install

| Tool | macOS (no sudo) | Fedora | Python |
|---|---|---|---|
| Cairo | `brew install cairo pkg-config` | `sudo dnf install cairo-devel pkgconf-pkg-config` | `uv pip install pycairo` |
| Skia | wheel has it | wheel has it | `uv pip install skia-python` |
| Poppler | `brew install poppler` | `sudo dnf install poppler-utils` | none (CLI) |

Fedora `dnf` needs sudo: hand the command to the human. Skip venv setup with
`uv run --with pycairo python script.py`.

## Cairo: animated title, one PNG per frame

```python
import math
import cairo

W, H, FPS, SECS = 1920, 1080, 30, 3
for i in range(FPS * SECS):
    t = i / FPS
    s = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    c = cairo.Context(s)
    c.set_source_rgb(0.04, 0.06, 0.08)
    c.paint()
    c.select_font_face("Sans", cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    c.set_font_size(140)
    a = min(1.0, t / 0.7)  # fade in over 0.7 s
    c.set_source_rgba(1, 1, 1, a)
    ext = c.text_extents("Title")
    c.move_to((W - ext.width) / 2 - ext.x_bearing, H / 2 + 40 * (1 - a) - ext.y_bearing / 2)
    c.show_text("Title")
    s.write_to_png(f"frames/{i:05d}.png")
```

## Skia: same idea

```python
import skia

W, H = 1920, 1080
surface = skia.Surface(W, H)
with surface as canvas:
    canvas.clear(skia.Color(11, 15, 20))
    paint = skia.Paint(Color=skia.ColorWHITE, AntiAlias=True)
    canvas.drawCircle(W / 2, H / 2, 200, paint)
surface.makeImageSnapshot().save("frames/00000.png", skia.kPNG)
```

## Poppler: PDF to frames

```bash
pdftocairo -png -scale-to-x 1920 -scale-to-y -1 slides.pdf ./video/<scene-id>/slide
```

Gives `slide-1.png`, `slide-2.png`, ... (number width depends on page count). Hold each
slide for N seconds in ffmpeg (`-loop 1 -t N`, see `ffmpeg-compose.md`).

## Rules

- Time from frame index only. No wall clock, fixed seeds.
- Name frames `00000.png`, `00001.png`, ... so ffmpeg reads them with `%05d.png`.
