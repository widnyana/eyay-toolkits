# fframes (motion, Rust)

https://github.com/dmtrKovalenko/fframes (MIT). Each frame is an SVG tree (`svgr!`) rendered
by Skia on the GPU, encoded through linked libav. Use it when the user asks for Rust or speed.

## Install

```bash
cargo install --locked cargo-fframes
cargo fframes new <scene-id> --template single-scene --format landscape --fps 30
```

macOS and Linux (arm64, x86_64) download prebuilt libav. Encoders must exist on the system:

| OS | Command | Sudo |
|---|---|---|
| macOS | `brew install x264 nasm` | no |
| Fedora | `sudo dnf install x264-devel nasm` (x264 is in RPM Fusion) | yes: hand to human |

`Cargo.toml` codec line: `fframes = { version = "1", features = ["h264", "libav-agree-gpl"] }`.

## Shape of a video

```rust
impl Video for MyVideo<'_> {
    const FPS: usize = 30;
    const WIDTH: usize = 1920;
    const HEIGHT: usize = 1080;

    fn duration(&self) -> fframes::Duration<'_> {
        fframes::Duration::Seconds(10.)
    }

    fn audio(&self) -> AudioMap<'_> {
        AudioMap::none() // audio is muxed later by ffmpeg
    }

    fn render_frame(&self, frame: Frame, ctx: &FFramesContext) -> fframes::Svgr<'_> {
        fframes::svgr!(
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"
                 width={ctx.current_video_size.width} height={ctx.current_video_size.height}>
                <rect x="400" y="400" width="200" height="200" fill="blue"
                    transform={frame.animate(fframes::timeline!(
                        at 0., animate Transform::translate(0, 0) => Transform::translate(600, 0), Easing::Linear,
                    ))} />
            </svg>
        )
    }
}
```

Full API: the upstream cheat sheet at
https://github.com/dmtrKovalenko/fframes/blob/main/skills/fframes-video/references/api.md.
Read it for the API only. Ignore its review workflow.

## Render

```bash
cargo run --release -- render
```

## Forbidden (HARD RULE)

Do not run `preview`, `inspect`, `strip`, `frame`, `onion`, `audio analyze`, or `render --draft`
to check how it looks. Those are review tools for the human.
