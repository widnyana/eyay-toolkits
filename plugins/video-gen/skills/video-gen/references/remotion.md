# Remotion (motion, JS/TS)

React components rendered frame by frame to MP4.

## Install

`node -v` must be 18 or newer. Missing: `mise use node@lts` (no sudo).

Minimal project in `./video/<scene-id>/`:

```bash
npm init -y
npm i remotion @remotion/cli react react-dom
npm i -D typescript @types/react
```

## Files

`src/index.ts`:

```ts
import { registerRoot } from "remotion";
import { Root } from "./Root";
registerRoot(Root);
```

`src/Root.tsx`:

```tsx
import { Composition } from "remotion";
import { Scene } from "./Scene";

export const Root = () => (
  <Composition id="Scene" component={Scene} durationInFrames={150} fps={30} width={1920} height={1080} />
);
```

`src/Scene.tsx`:

```tsx
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const Scene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const scale = spring({ frame, fps, config: { damping: 12 } });
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0f14", justifyContent: "center", alignItems: "center" }}>
      <h1 style={{ color: "white", fontSize: 140, opacity, transform: `scale(${scale})` }}>Title</h1>
    </AbsoluteFill>
  );
};
```

## Render

```bash
npx remotion render src/index.ts Scene ../out/<scene-id>.mp4 --codec h264
```

## Rules

- All motion comes from `useCurrentFrame()`. No `Date.now()`, no CSS animations, no `Math.random()`
  (use `random("seed")` from `remotion`).
- Sequence parts inside one scene with `<Sequence from={..} durationInFrames={..}>`.
- Images and fonts go in `public/` and load with `staticFile("name.png")`.
- Do not add audio in Remotion. Audio is made in Python and muxed by ffmpeg.
- Do not open Remotion Studio or run `npx remotion still` for review (HARD RULE).
- Remotion has its own license terms for companies. Tell the human once if the video is for
  a company: https://www.remotion.dev/license
