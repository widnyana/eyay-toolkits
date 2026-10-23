"""Offscreen shader render: one PNG per frame, no window, no swapchain.

Run: WGPU_BACKEND_TYPE=Vulkan uv run --with wgpu --with pillow python render_wgpu.py --out frames --secs 5
"""

import argparse
import struct
from pathlib import Path

import wgpu
from PIL import Image

SHADER = """
struct U { time: f32, w: f32, h: f32, _pad: f32 };
@group(0) @binding(0) var<uniform> u: U;

@vertex
fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
    // one triangle that covers the whole screen
    let p = array(vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));
    return vec4(p[i], 0.0, 1.0);
}

@fragment
fn fs(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
    let uv = pos.xy / vec2(u.w, u.h);
    let c = 0.5 + 0.5 * cos(u.time + uv.xyx + vec3(0.0, 2.0, 4.0));
    return vec4(c, 1.0);
}
"""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="frames")
    ap.add_argument("--secs", type=float, default=5.0)
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--height", type=int, default=1080)
    a = ap.parse_args()

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    w, h = a.width, a.height

    device = wgpu.gpu.request_adapter_sync(power_preference="high-performance").request_device_sync()
    fmt = wgpu.TextureFormat.rgba8unorm
    target = device.create_texture(
        size=(w, h, 1),
        format=fmt,
        usage=wgpu.TextureUsage.RENDER_ATTACHMENT | wgpu.TextureUsage.COPY_SRC,
    )
    ubuf = device.create_buffer(size=16, usage=wgpu.BufferUsage.UNIFORM | wgpu.BufferUsage.COPY_DST)
    shader = device.create_shader_module(code=SHADER)
    pipeline = device.create_render_pipeline(
        layout="auto",
        vertex={"module": shader, "entry_point": "vs"},
        fragment={"module": shader, "entry_point": "fs", "targets": [{"format": fmt}]},
        primitive={"topology": wgpu.PrimitiveTopology.triangle_list},
    )
    bind = device.create_bind_group(
        layout=pipeline.get_bind_group_layout(0),
        entries=[{"binding": 0, "resource": {"buffer": ubuf}}],
    )
    view = target.create_view()

    for i in range(round(a.secs * a.fps)):
        t = i / a.fps  # time comes from the frame index only: deterministic
        device.queue.write_buffer(ubuf, 0, struct.pack("4f", t, w, h, 0.0))
        enc = device.create_command_encoder()
        rp = enc.begin_render_pass(
            color_attachments=[{"view": view, "load_op": "clear", "store_op": "store", "clear_value": (0, 0, 0, 1)}]
        )
        rp.set_pipeline(pipeline)
        rp.set_bind_group(0, bind)
        rp.draw(3)
        rp.end()
        device.queue.submit([enc.finish()])
        data = device.queue.read_texture(
            {"texture": target, "origin": (0, 0, 0), "mip_level": 0},
            {"offset": 0, "bytes_per_row": w * 4},
            (w, h, 1),
        )
        Image.frombytes("RGBA", (w, h), bytes(data)).save(out / f"{i:05d}.png")


if __name__ == "__main__":
    main()
