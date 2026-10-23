# p5.js (canvas drawing)

Generative or animated sketches. p5.js needs a browser, so render headless with Puppeteer:
the sketch draws one frame on request, Node saves it as PNG.

## Install

```bash
npm init -y && npm i puppeteer p5
```

Puppeteer downloads its own Chrome. No sudo.

## `sketch.html`

```html
<!doctype html>
<html><body style="margin:0">
<script src="node_modules/p5/lib/p5.min.js"></script>
<script>
const W = 1920, H = 1080, FPS = 30;
function setup() {
  pixelDensity(1);
  createCanvas(W, H);
  noLoop();
  randomSeed(42);
  noiseSeed(42);
}
function draw() {} // drawing happens in renderFrame
window.renderFrame = (i) => {
  const t = i / FPS; // time from frame index only
  randomSeed(42);
  background(11, 15, 20);
  noStroke();
  fill(255);
  circle(W / 2 + 400 * Math.cos(t), H / 2 + 300 * Math.sin(t * 2), 120);
  return document.querySelector("canvas").toDataURL("image/png");
};
</script>
</body></html>
```

## `render.mjs`

```js
import puppeteer from "puppeteer";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [secs = "5", fps = "30", out = "frames"] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto("file://" + resolve("sketch.html"));
  await page.waitForFunction(() => window.renderFrame && document.querySelector("canvas"));
  const n = Math.round(Number(secs) * Number(fps));
  for (let i = 0; i < n; i++) {
    const url = await page.evaluate((i) => window.renderFrame(i), i);
    writeFileSync(`${out}/${String(i).padStart(5, "0")}.png`, Buffer.from(url.split(",")[1], "base64"));
  }
} finally {
  await browser.close();
}
```

Run: `node render.mjs 10 30 frames`. Output is a PNG sequence for `ffmpeg-compose.md`.

## Rules

- Never use `frameCount`, `millis()`, or `saveFrames()`. Time comes from the `i` argument.
- Reset seeds inside `renderFrame` so frame N is the same on every run.
- The script closes its own Chrome in `finally`. Do not leave it running.
