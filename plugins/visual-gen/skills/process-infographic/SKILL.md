---
name: process-infographic
description: |
  This skill should be used when the user asks to "create an infographic",
  "generate a process flow", "make a step-by-step diagram",
  "design a timeline", "create a workflow diagram",
  "visualize a pipeline", "make a numbered sequence",
  "show the steps as an image", "create a lifecycle diagram",
  "make a flow diagram", or mentions numbered steps, process stages,
  deployment pipelines, CI/CD flows, or sequential procedures.
  Do NOT trigger for cover images or system architecture diagrams.
version: 0.1.0
---

# Process Infographic Generator

Generate step-by-step process infographics as PNG by writing HTML+CSS and
rendering through Chrome headless. Each infographic is a self-contained HTML
file with numbered steps, titles, and descriptions arranged in a vertical
timeline, horizontal phases, or grid layout.

The output is a static PNG suitable for blog posts, documentation, and
presentations. No external images, no JavaScript, no server-side rendering.

## Overview

Process infographics turn multi-step procedures into scannable visual flows.
Use this skill when the content has a clear sequence: deployment pipelines,
onboarding steps, request lifecycles, data transformation stages, or any
numbered process.

**What this skill produces:**
- A PNG image at 1200x630 to 1200x1500px (height scales with step count)
- Numbered steps with titles and one-line descriptions
- Connected by a timeline thread or grouped into phases
- Light or dark theme matching the content tone

**When to use this skill:**
- Blog posts explain a multi-step process
- Documentation needs a visual procedure flow
- A series of steps needs to be presented as a single image
- A deployment pipeline, CI/CD flow, or lifecycle diagram is needed

## Detailed Workflow

### Step 1: Identify the Steps

Extract process steps from the source content. Each step needs:
- A short title (2-5 words)
- A one-line description (under 15 words)
- An optional phase or group label

If the source content has headings or numbered items, use those directly.
If the content is prose, distill it into discrete stages.

### Step 2: Select Dimensions

Choose canvas height based on step count:

| Steps | Width | Height | Layout |
|-------|-------|--------|--------|
| 3-4 | 1200 | 630 | Grid (2x2) or vertical |
| 5-6 | 1200 | 900 | Vertical timeline |
| 7-9 | 1200 | 1200 | Vertical with phases |
| 10+ | 1200 | 1500 | Vertical with phases, compact type |

General formula: `height = 630 + (steps_above_4 * 135)`, capped at 1500.

### Step 3: Choose Layout Pattern

**Vertical timeline** (default): Steps flow top-to-bottom with a left-aligned
connecting line and numbered markers. Best for sequential processes.

**Horizontal phases**: Steps grouped into 3-5 horizontal columns. Each column
is a phase with sub-steps. Best for parallel or categorized stages.

**Grid**: Equal-sized cards in 2 or 3 columns. Best for 4-8 steps with short
descriptions where sequence matters less than completeness.

See `references/infographic-patterns.md` for complete CSS patterns.

### Step 4: Write the HTML+CSS

Create a self-contained HTML file. Start from this boilerplate and adapt:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 900px;
    overflow: hidden;
    font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
    background: #ffffff;
    color: #1a1a2e;
  }
  .container { padding: 48px 80px; }
  .title { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
  .subtitle { font-size: 13px; color: #666; margin-bottom: 32px; }
  .timeline {
    position: relative;
    margin-left: 18px;
    padding-left: 32px;
    border-left: 2px solid #d1d5db;
  }
  .step {
    position: relative;
    margin-bottom: 32px;
  }
  .step-marker {
    position: absolute;
    left: -49px;
    top: 4px;
    width: 36px; height: 36px;
    border-radius: 50%;
    background: #2d8659;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 14px;
  }
  .step-title { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
  .step-desc { font-size: 12px; color: #555; line-height: 1.5; }
</style>
</head>
<body>
  <div class="container">
    <div class="title">Process Title</div>
    <div class="subtitle">Brief description of the flow</div>
    <div class="timeline">
      <div class="step">
        <div class="step-marker">1</div>
        <div class="step-title">Step Title</div>
        <div class="step-desc">One-line description of what happens.</div>
      </div>
    </div>
  </div>
</body>
</html>
```

Key constraints:
- Set exact pixel dimensions on `body` (`width` + `height` + `overflow: hidden`)
- Use Google Fonts loaded via `@import`
- No external images, no JavaScript
- All styles inlined in `<style>` tag

### Step 5: Write to Temp File

Save the HTML to `tmp/` in the current project directory. Use a descriptive
filename: `tmp/deployment-pipeline.html`, `tmp/auth-flow.html`, etc.

### Step 6: Capture the Screenshot

Run the screenshot script with the correct dimensions:

```bash
bash scripts/screenshot.sh tmp/infographic.html output/path/infographic.png 1200 900
```

Pass the height as the 4th argument when using a taller canvas:
```bash
bash scripts/screenshot.sh tmp/infographic.html static/images/flow.png 1200 1200
```

### Step 7: Verify the Output

Read the generated PNG file to check:
- All steps are visible and not clipped
- Text is readable at the rendered size
- Step numbers are correctly ordered
- No overflow or scrollbar artifacts
- Spacing between steps is consistent

### Step 8: Clean Up

Remove the temp HTML file after confirming the PNG is correct.

## Theme Variations

### Light Theme (Default)

White background, dark text, green step markers:
- Background: `#ffffff`
- Primary text: `#1a1a2e`
- Secondary text: `#555555`
- Step markers: `#2d8659` (green)
- Timeline line: `#d1d5db`

### Dark Theme

Dark slate background, light text, cyan accents:
- Background: `#0f172a`
- Primary text: `#f1f5f9`
- Secondary text: `#94a3b8`
- Step markers: `#06b6d4` (cyan)
- Timeline line: `#334155`

Match the theme to the content tone. Technical infrastructure and devops
topics suit dark themes. General tutorials and user-facing processes suit
light themes.

## Phase Grouping

For multi-stage processes, wrap steps under labeled phase headers:

```html
<div class="phase-group">
  <div class="phase-group-label">Phase 1: Setup</div>
  <div class="step">...</div>
  <div class="step">...</div>
</div>
```

Phase headers use green underline and uppercase text:
```css
.phase-group-label {
  font-size: 11px;
  font-weight: 700;
  color: #2d8659;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
  padding-bottom: 6px;
  border-bottom: 2px solid #2d8659;
  display: inline-block;
}
```

## Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| Steps clipped at bottom | Canvas height too small | Increase `body` height or reduce step count |
| Text too small to read | Font size under 11px | Raise minimum font size to 12px |
| Step markers misaligned | `position: absolute` offset wrong | Adjust `left` on `.step-marker` (should be `-49px` with timeline padding) |
| Chrome not found | No browser in PATH | Install `google-chrome` or `chromium` |
| Blank white PNG | `@import` font failed, blocking render | Move `@import` to first line of `<style>` block |
| Scrollbar visible | Content overflows canvas | Increase height or reduce padding |
| Timeline line missing | `border-left` color too light | Use `#d1d5db` or darker |

## Quick Reference

| Item | Value |
|------|-------|
| Canvas width | 1200px (fixed) |
| Canvas height | 630/900/1200/1500px (step-dependent) |
| Font | Inter, 400/700 |
| Step marker | 36px circle, `#2d8659` fill |
| Step title | 16px bold |
| Step desc | 12px regular, `#555` |
| Output format | PNG via Chrome headless |

## Additional Resources

### Reference Files

- **`references/infographic-patterns.md`** - Complete CSS patterns for vertical timeline, horizontal phases, grid layout, phase grouping, dark theme, and typography scale

### Scripts

- **`scripts/screenshot.sh`** - Chrome headless capture utility with custom dimensions support
