# video-gen

Make videos from code. The agent plans scenes, writes the source, renders each part once,
and stitches everything with ffmpeg. You review the result. The agent never does.

## The rule

The agent does not check quality. It does not view frames, play audio, run analysis tools,
or re-render "to make it better". It reports the render command, exit code, and output path,
then stops. A second render happens only to fix a build or runtime error.

## Pipelines

| Pipeline | Frames | Audio | Stitch |
|---|---|---|---|
| A. Mixed (default) | Remotion (JS/TS) or fframes (Rust) for motion, p5.js for canvas, Cairo/Skia/Poppler for 2D | Python: numpy synth or MIDI + FluidSynth | ffmpeg |
| B. Python GPU | Python + wgpu on Vulkan, offscreen, PNG per frame | Python synthesizer | ffmpeg |

Pipeline B is picked when you ask for Vulkan, shaders, GPU or offline render, or "all Python".

## Requirements

Only the tools your scene plan uses. The agent installs what it can without sudo (brew, mise,
uv, cargo, npm) and gives you the command for the rest (for example `sudo dnf install ...`).

| Tool | Used for |
|---|---|
| Node 18+ | Remotion, p5.js (via Puppeteer) |
| Rust + `cargo-fframes` | fframes |
| Python 3 + `uv` | audio, Cairo, Skia, Vulkan frames |
| Cairo, Poppler | 2D graphics, PDF to frames |
| Vulkan loader + driver (MoltenVK on macOS) | pipeline B with a forced Vulkan backend |
| ffmpeg | stitching and muxing |

## Usage

```
make a 10 s intro: logo slides in, title fades up, with a 120 BPM synth beat
render a 20 s shader video with Vulkan and a drone soundtrack, all Python
turn slides.pdf into a video, 4 s per slide, soft pad music underneath
```

Output lands in `./video/out/final.mp4`. Scene source is in `./video/<scene-id>/`.

## Install

```bash
/plugin install video-gen@eyay-toolkits
```
