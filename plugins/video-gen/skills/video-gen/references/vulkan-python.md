# Pipeline B: Python + Vulkan offscreen frames

Binding: `wgpu` (wgpu-py). It runs on Vulkan when `WGPU_BACKEND_TYPE=Vulkan` is set.
Raw Vulkan from Python (`vulkan` cffi package) needs hundreds of lines of setup for the
same result; do not use it unless the user asks for raw Vulkan by name.

## Install

| OS | Command | Sudo |
|---|---|---|
| any | `uv run --with wgpu --with pillow python ...` (no venv setup needed) | no |
| macOS | `brew install molten-vk vulkan-loader vulkan-tools` (only for a forced Vulkan backend) | no |
| Fedora | `sudo dnf install vulkan-loader mesa-vulkan-drivers vulkan-tools` | yes: hand to human |

No GPU on Linux: `mesa-vulkan-drivers` includes lavapipe, a CPU Vulkan driver. It is slow
but it works.

macOS has no native Vulkan. Without MoltenVK, leave `WGPU_BACKEND_TYPE` unset and wgpu uses
Metal. Tell the human which backend ran.

Check: `vulkaninfo --summary` lists at least one device.

## Starter script

`scripts/render_wgpu.py` (in this skill) renders a full-screen fragment shader to
`<out>/00000.png`, `00001.png`, ... It is the template for pipeline B. `<skill base directory>` is the path shown when this skill loads:

```bash
cp <skill base directory>/scripts/render_wgpu.py ./video/<scene-id>/render.py
WGPU_BACKEND_TYPE=Vulkan uv run --with wgpu --with pillow \
  python ./video/<scene-id>/render.py --out ./video/<scene-id>/frames --secs 10 --fps 30
```

Edit only the `SHADER` string (WGSL) for a new look. The uniform `u` gives `time`, `w`, `h`.
Add fields in 16-byte groups (4 x f32) and update the `struct.pack` call to match.

## Rules

- Time comes from the frame index only (`t = i / fps`). No wall clock.
- One texture, one readback per frame (`device.queue.read_texture`). No window, no swapchain.
- Shaders: WGSL is primary. SPIR-V (bytes) also works. GLSL is experimental in wgpu-py:
  the module `label` must contain `vert`, `frag`, or `comp`.
- Output is a PNG sequence. Stitch it with `references/ffmpeg-compose.md`.
