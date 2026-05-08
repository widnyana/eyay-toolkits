---
name: cover-image
description: |
  This skill should be used when the user asks to "create a cover image",
  "generate a blog cover", "make an OG image", "design a social preview",
  "create a thumbnail for a post", "add a cover to my article",
  "make a featured image", "create a header image for a post",
  "generate an open graph image", or mentions cover images, OG images,
  social preview images, or blog post thumbnails. Do NOT trigger for
  diagrams, architecture diagrams, or process flows.
version: 0.1.0
---

# Cover Image Generator

Generate blog cover images and Open Graph/social preview images as PNG files. Each cover is a self-contained HTML document with inline CSS, captured as a screenshot via Chrome headless at exactly 1200x630 pixels.

The output is a static PNG suitable for Hugo front matter (`image:`), HTML `<meta property="og:image">`, and Twitter card metadata. No external images, no JavaScript, no server-side rendering required at capture time.

## Overview

Cover images serve as the primary visual identity for a blog post across social platforms, search results, and link previews. Each image is designed from scratch per post, reflecting the topic, tone, and key concepts of the content.

**What this skill produces:**
- A 1200x630px PNG file rendered from HTML+CSS
- Self-contained HTML with no external image dependencies
- Typography-driven design with CSS decorative elements
- Consistent branding placement

**When to use this skill:**
- Blog posts need an OG/social preview image
- Hugo front matter needs an `image:` field
- A series of posts need visually cohesive covers
- Existing covers need updating or redesigning

## Detailed Workflow

### Step 1: Read the source content

Read the blog post or article to extract the title, key concepts, and overall tone. The cover image must accurately represent the content. Identify:

- The exact title (or a shortened version if it exceeds 40 characters)
- The primary topic category (technical, tutorial, explanatory, announcement)
- Key visual metaphors or concepts from the content
- Whether the post is part of a series (affects series label placement)
- The desired output file path

If the user provides only a title without a file path, ask for the target output location before proceeding.

### Step 2: Determine the visual direction

Select a design approach based on the post topic and tone:

- **Technical posts** (programming, infrastructure, security, blockchain): dark background with bold typography and accent gradients. Conveys depth and technical rigor.
- **Tutorial/guide posts** (how-to, step-by-step, beginner): light background with clean layout and structured visual hints. Conveys clarity and approachability.
- **Conceptual/explanatory posts** (architecture, design patterns, theory): gradient background with centered typography. Conveys breadth and sophistication.
- **Announcement posts** (new feature, series launch, milestone): bold accent colors with prominent typography. Conveys energy and importance.

Consult `references/cover-design.md` for the full color palette and typography specifications for each direction.

### Step 3: Design the HTML+CSS

Create a complete, self-contained HTML file. All styles must be inline within a `<style>` block. No external stylesheets, no `<link>` tags (except Google Fonts via `@import`), no external images, and no JavaScript.

**Hard constraints:**
- Canvas dimensions: exactly 1200x630px set on `body`
- `overflow: hidden` on body to prevent scroll artifacts
- Max 2 fonts: one display font for titles, one sans-serif for metadata
- Google Fonts loaded via `@import url(...)` inside the `<style>` block
- All decorative elements created with CSS (gradients, shapes, transforms)
- No `<img>` tags, no `background-image: url(...)` pointing to external files

See the HTML boilerplate section below for a complete starting template.

### Step 4: Write to a temp file

Save the HTML to a temporary location. Use the project's `tmp/` directory:

```
tmp/cover-<slug>.html
```

Derive the slug from the post title (lowercase, hyphens, max 30 characters). Create the `tmp/` directory if it does not exist. Writing to `tmp/` keeps generated HTML separate from source content and makes cleanup straightforward.

### Step 5: Capture the screenshot

Run the screenshot script to render the HTML to PNG:

```bash
bash scripts/screenshot.sh tmp/cover-<slug>.html <output-path>/cover.png
```

The script handles Chrome headless invocation with the correct flags (`--headless=new`, `--disable-gpu`, `--no-sandbox`, `--hide-scrollbars`). It outputs the PNG at the specified path.

**Important:** Run the script from the skill directory so that `scripts/screenshot.sh` resolves correctly, or use an absolute path to the script.

### Step 6: Verify the output

Read the generated PNG file to visually verify it rendered correctly. Check for:

- Title text is fully visible and not clipped
- Text is readable at half-size (simulate by checking overall layout density)
- Decorative elements are positioned correctly (not overlapping critical text)
- Colors render as specified (Chrome may handle some CSS differently)
- No white/blank areas where content should be
- Safe margins are respected (no text too close to edges)

If the image does not look correct, adjust the HTML and re-run the screenshot. Common fixes are in the troubleshooting section below.

### Step 7: Clean up

After confirming the PNG renders correctly, delete the temp HTML file:

```bash
rm tmp/cover-<slug>.html
```

Do not leave temp HTML files in the repository. If the `tmp/` directory is now empty, remove it as well.

### Step 8: Integrate with the blog post

Add the cover image to the blog post front matter:

```yaml
---
title: "Post Title"
image: /images/category/cover.png
---
```

Copy or move the PNG to the appropriate static images directory for the blog. The exact path depends on the blog's static file structure.

## HTML Boilerplate

Use this template as the starting point for every cover image. It includes the correct dimensions, font loading, layout zones, and branding placement.

### Dark Variant Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    width: 1200px;
    height: 630px;
    overflow: hidden;
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    background: #0f172a;
    color: #f8fafc;
    position: relative;
  }

  /* Background decoration */
  .bg-circle {
    position: absolute;
    border-radius: 50%;
    opacity: 0.06;
  }
  .bg-circle-1 {
    width: 600px;
    height: 600px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    top: -200px;
    right: -100px;
  }
  .bg-circle-2 {
    width: 400px;
    height: 400px;
    background: linear-gradient(135deg, #06b6d4, #3b82f6);
    bottom: -150px;
    left: -50px;
  }

  /* Layout */
  .cover {
    position: relative;
    z-index: 1;
    padding: 60px 80px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  /* Series label */
  .series {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #818cf8;
    margin-bottom: 20px;
  }

  /* Title */
  .title {
    font-size: 56px;
    font-weight: 800;
    line-height: 1.15;
    max-width: 900px;
    margin-bottom: 16px;
  }

  /* Subtitle */
  .subtitle {
    font-size: 22px;
    font-weight: 400;
    color: #94a3b8;
    max-width: 700px;
    line-height: 1.4;
  }

  /* Branding */
  .branding {
    position: absolute;
    bottom: 24px;
    right: 80px;
    font-size: 14px;
    color: #94a3b8;
    font-weight: 500;
  }
</style>
</head>
<body>
  <div class="bg-circle bg-circle-1"></div>
  <div class="bg-circle bg-circle-2"></div>

  <div class="cover">
    <div class="series">Series Label</div>
    <div class="title">Post Title Goes Here</div>
    <div class="subtitle">Optional subtitle or tagline</div>
  </div>

  <div class="branding">widnyana.web.id</div>
</body>
</html>
```

### Light Variant Template

Replace the dark-specific styles:

```css
body {
  background: #ffffff;
  color: #0f172a;
}

.bg-circle {
  opacity: 0.04;
}

.series {
  color: #3b82f6;
}

.subtitle {
  color: #64748b;
}

.branding {
  color: #64748b;
}
```

The structure remains identical. Only background, text, and accent colors change.

## Design Rules

### When to use dark vs light

| Topic Type | Background | Rationale |
|------------|-----------|-----------|
| Programming, Rust, Solidity | Dark (#0f172a) | Technical depth |
| Infrastructure, DevOps, CI/CD | Dark (#0f172a) | Systems-level content |
| Security, auditing | Dark (#0f172a) | Seriousness, gravity |
| Blockchain, crypto, DeFi | Dark (#0f172a) | Industry convention |
| Tutorials, guides, how-to | Light (#ffffff) | Approachable, clear |
| Architecture, design patterns | Gradient | Breadth, sophistication |
| Career, soft skills | Light (#ffffff) | Friendly, readable |
| Announcements, launches | Bold gradient | Energy, prominence |

### Font loading

Always load fonts via `@import` inside the `<style>` block, not via `<link>` in the head. This keeps the HTML truly self-contained and avoids rendering issues where Chrome headless may not wait for external `<link>` resources.

Include only the weights actually used. Loading unused weights slows Chrome headless rendering:

```css
/* Good: only needed weights */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&display=swap');

/* Bad: loading all weights */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');
```

### Dimensions and safe area

The full canvas is 1200x630px. Social platforms (Twitter, LinkedIn, Slack, Discord) may crop edges. Critical content (title text, series labels) must stay within the safe area:

- **Safe area:** 1040 x 510px centered within the canvas
- **Left/right margin:** minimum 80px
- **Top/bottom margin:** minimum 60px
- **Branding:** stays within safe area (bottom: 20-50px), uses solid muted colors with >= 5.5:1 contrast. Omit entirely when no branding is provided.

### Visual element guidelines

Each cover must include at least one visual element beyond pure typography. Options:

1. **Gradient orbs:** Large translucent circles positioned behind the text area. Use 2-3 orbs with low opacity (0.04-0.08) for depth.
2. **Accent bars:** Thin horizontal or diagonal lines with gradient colors to add structure.
3. **Geometric shapes:** Triangles, rotated squares, or hexagons as subtle background patterns.
4. **Code snippet visuals:** For programming posts, a styled code block with syntax-colored text adds context.
5. **Grid/dot patterns:** Repeating dot or line patterns using CSS `background-image` with `linear-gradient` for technical posts.

All decorative elements must use `position: absolute` and sit behind text content via `z-index`. Never let decorations interfere with text legibility.

## Common Issues and Troubleshooting

### Chrome not found

**Symptom:** `scripts/screenshot.sh` exits with `error: no Chrome/Chromium binary found in PATH`.

**Fix:** Install Chrome or Chromium. The script searches for `google-chrome-stable`, `google-chrome`, `chromium-browser`, or `chromium` in that order. On Fedora: `sudo dnf install chromium`. On Ubuntu: `sudo apt install chromium-browser`. Verify with `which google-chrome-stable`.

### Font not loading or rendering as fallback

**Symptom:** Title renders in Arial or Times New Roman instead of the specified Google Font.

**Fixes:**
- Verify the `@import` URL is correct and the font name matches exactly (case-sensitive).
- Ensure the `@import` is the first rule inside `<style>`. CSS `@import` must precede all other rules.
- Add a small `font-display: swap` parameter: `&display=swap` in the Google Fonts URL.
- If the font still fails, fall back to a web-safe stack: `'Inter', 'Helvetica Neue', Arial, sans-serif`.

### Text clipped or overflowing

**Symptom:** Title or subtitle text is cut off at the bottom or right edge.

**Fixes:**
- Check that `overflow: hidden` is set on `body` (this is intentional, but confirms clipping is happening).
- Reduce font size if the title exceeds 2 lines at the current size.
- Increase `max-width` on the title element, but never exceed 1000px to preserve safe margins.
- Shorten the title text for the cover. The cover title does not need to match the full post title exactly.

### Image appears blank or white

**Symptom:** The output PNG is entirely white or appears empty.

**Fixes:**
- Verify the HTML file exists and is not empty before running the screenshot script.
- Check that `body` has an explicit `background` color set. Chrome headless defaults to white.
- Ensure all content has `z-index` higher than 0 if background elements are present.
- Open the HTML file in a regular browser to confirm it renders correctly before blaming headless Chrome.

### Colors look different from CSS values

**Symptom:** Gradient or background colors appear washed out or shifted compared to the CSS specification.

**Fixes:**
- Chrome headless renders in sRGB color space. If the display preview uses a wider gamut, colors may appear different.
- Avoid `color()` or `lab()` CSS color functions. Use hex (`#0f172a`) or `rgba()` values only.
- Verify the PNG is not being displayed at a different size than 1200x630 (scaling changes color perception).

### Screenshot shows scrollbars or extra whitespace

**Symptom:** The PNG has a scrollbar or extra whitespace on the right or bottom.

**Fixes:**
- Confirm `overflow: hidden` is set on `body`.
- Add `margin: 0; padding: 0` to both `html` and `body` via the universal selector `* { margin: 0; padding: 0; }`.
- The screenshot script passes `--hide-scrollbars` but this may not suppress all scrollbar artifacts in all Chrome versions. The CSS `overflow: hidden` is the reliable fix.

## Quick Reference

### Cover Image Specifications

| Property | Value |
|----------|-------|
| Canvas size | 1200 x 630 px |
| Safe area | 1040 x 510 px (centered) |
| Format | PNG |
| Min margins | 80px horizontal, 60px vertical |
| Max fonts | 2 (display + body) |
| External images | None (CSS only) |
| JavaScript | None (static HTML+CSS) |

### Output Locations

| Context | Typical Path |
|---------|-------------|
| Hugo blog | `static/images/<category>/cover.png` |
| Temp HTML | `tmp/cover-<slug>.html` |

### Color Palettes (Quick)

| Variant | Background | Primary Text | Secondary Text | Accent |
|---------|-----------|-------------|---------------|--------|
| Dark | `#0f172a` | `#f8fafc` | `#94a3b8` | `#6366f1` to `#8b5cf6` |
| Light | `#ffffff` | `#0f172a` | `#64748b` | `#3b82f6` |
| Gradient | `#1e1b4b` to `#312e81` | `#f8fafc` | `#a5b4fc` | `#818cf8` |

### Workflow Checklist

1. Read the post content
2. Select dark/light/gradient direction
3. Write self-contained HTML with inline CSS
4. Save to `tmp/cover-<slug>.html`
5. Run `bash scripts/screenshot.sh tmp/cover-<slug>.html <output>.png`
6. Read the PNG to verify rendering
7. Delete temp HTML
8. Add to blog front matter

## Additional Resources

### Local References

- **`references/cover-design.md`** - Complete color palettes, typography scale, layout zones, and visual element specifications for cover images
- **`scripts/screenshot.sh`** - Chrome headless capture script that handles binary detection, viewport sizing, and output file management

### Related Design Guides

For diagram and infographic styles used in other visual-gen skills, consult the architecture-diagram and process-infographic skill references.
