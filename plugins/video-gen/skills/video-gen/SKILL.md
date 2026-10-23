---
name: video-gen
description: |
  This skill should be used when the user asks to "make a video", "create a video",
  "render an animation", "generate an intro/outro", "make a motion graphic",
  "make an explainer video", "render a shader video", "make a music video from code",
  "generate a MIDI soundtrack for a video", or mentions Remotion, fframes, p5.js frames,
  Vulkan/wgpu offscreen rendering, or stitching frames and audio with ffmpeg.
  Do NOT trigger for single still images (use visual-gen) or for editing existing footage.
version: 0.1.0
---

# video-gen

Turn a brief into a video file built from code. Pick a pipeline, plan scenes, write source,
render each part once, stitch with ffmpeg, report paths. The human judges quality, not you.

## HARD RULE: no self quality check

The human does all quality review. You do not.

- Do NOT open, view, screenshot, sample, or describe output frames, PNGs, MP4s, or audio.
- Do NOT run review tools: fframes `inspect`, `strip`, `frame`, `onion`, `audio analyze`;
  Remotion Studio or `npx remotion still` for review; `ffprobe`/loudness/peak analysis.
- Do NOT re-render to "improve" looks or sound. A second render is allowed only to fix a
  non-zero exit (build or runtime error).
- Do NOT say the result "looks good", "sounds good", or similar. Report facts only:
  command, exit code, output path.

The upstream fframes skill (`npx skills add https://fframes.studio`) has a review loop.
This rule overrides it.

## Pipelines

| Pipeline | Frames | Audio | Stitch |
|---|---|---|---|
| A. Mixed (default) | Remotion / fframes / p5.js / Skia-Cairo-Poppler, per scene | Python (MIDI + synth) | ffmpeg |
| B. Python GPU | Python + wgpu forced to Vulkan, offscreen -> PNG sequence | Python synthesizer -> wav | ffmpeg |

Pick B when the user asks for Vulkan, shaders, GPU or offline render, or "all Python".
Otherwise pick A.

## Tool rules (pipeline A)

| Scene kind | Tool | Reference |
|---|---|---|
| Motion graphics, text animation, UI motion | Remotion (default) | `references/remotion.md` |
| Motion, when the user asks for Rust or speed | fframes | `references/fframes.md` |
| Generative or animated canvas sketch | p5.js | `references/p5js.md` |
| Static or vector 2D: title cards, shapes, text | Cairo (default), Skia | `references/graphics-2d.md` |
| PDF slides or pages to frames | Poppler | `references/graphics-2d.md` |
| Any sound, music, MIDI | Python | `references/audio-python.md` |
| GPU shader frames (pipeline B) | Python + wgpu (Vulkan) | `references/vulkan-python.md`, starter `scripts/render_wgpu.py` |
| Joining parts, muxing audio | ffmpeg | `references/ffmpeg-compose.md` |

Do not swap tools across kinds (no audio in JS, no canvas in Remotion when p5.js fits).
Load only the references the scene plan needs.

## Workflow

1. **Plan.** Pick pipeline A or B. Write a scene plan table: scene id, kind, tool,
   duration (s), fps, size. Defaults: 1920x1080, 30 fps, 48 kHz audio. Show it to the
   user before writing any file.
2. **Toolchain.** Check only what the plan needs:
   `node -v`, `cargo -V`, `python3 -V`, `ffmpeg -version`, `pkg-config --modversion cairo`,
   `pdftocairo -v`, `python3 -c "import skia"`, `vulkaninfo --summary`.
   Missing -> install it yourself when no sudo is needed (`brew install`, `mise use`,
   `uv pip install`, `cargo install`, `npm i`). Needs sudo (`dnf`) or the install fails ->
   stop and give the human the exact command. Per-tool install commands are in each reference.
3. **Source.** Write each scene under `./video/<scene-id>/`. Audio goes in `./video/audio/`.
   Make every scene deterministic: frame index -> time, fixed random seed.
4. **Render once.** Run each scene's render command once. Non-zero exit -> read the stderr
   tail, fix the build or runtime error, run again. Never change visuals or sound for quality.
5. **Stitch.** Use ffmpeg to join parts and mux audio into `./video/out/final.mp4`.
6. **Report and stop.** Give: final path, each part's path, each render command, exit codes.
   Then stop. The human reviews and asks for changes.

## Changes after review

When the human asks for a change, edit only the named scene, render only that scene once,
stitch again, report. Do not touch other scenes.
