# ffmpeg: stitch parts and audio

Install: `brew install ffmpeg` (macOS) or `sudo dnf install ffmpeg` (Fedora, RPM Fusion: hand to human).

Every part is encoded with the same flags, so concat works without surprises:

```
-c:v libx264 -pix_fmt yuv420p -r 30 -crf 18 -preset medium
```

## PNG sequence -> part

```bash
ffmpeg -y -framerate 30 -i video/<scene-id>/frames/%05d.png \
  -c:v libx264 -pix_fmt yuv420p -r 30 -crf 18 -preset medium video/out/<scene-id>.mp4
```

## Still image held N seconds -> part

```bash
ffmpeg -y -loop 1 -t 5 -framerate 30 -i video/<scene-id>/slide-1.png \
  -c:v libx264 -pix_fmt yuv420p -r 30 -crf 18 -preset medium video/out/<scene-id>.mp4
```

## Normalize a part from Remotion or fframes

Their MP4s may differ in fps or size. Re-encode to the shared flags before concat:

```bash
ffmpeg -y -i in.mp4 -an -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -pix_fmt yuv420p -r 30 -crf 18 -preset medium video/out/<scene-id>.mp4
```

## Concat parts in order

`video/out/list.txt`:

```
file 'intro.mp4'
file 'main.mp4'
file 'outro.mp4'
```

```bash
ffmpeg -y -f concat -safe 0 -i video/out/list.txt -c copy video/out/joined.mp4
```

## Mux audio

```bash
ffmpeg -y -i video/out/joined.mp4 -i video/audio/track.wav \
  -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest video/out/final.mp4
```

No video track needs audio? Copy `joined.mp4` to `final.mp4`.

## Rules

- Exit code and output path are the only things you report.
- No `ffprobe` checks, no `loudnorm` analysis pass, no frame extraction for review (HARD RULE).
