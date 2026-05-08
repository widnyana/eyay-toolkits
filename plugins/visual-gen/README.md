# visual-gen

Generate blog cover images, architecture diagrams, and process infographics as PNG files using HTML+CSS rendered via Chrome headless.

Every image is a self-contained HTML file -- no external assets, no JavaScript, no server-side rendering. Chrome headless captures it at the exact pixel dimensions you specify.

## Skills

### Cover Image

Blog cover images and Open Graph/social preview images at 1200x630px.

- Dark, light, or gradient backgrounds based on topic tone
- Typography-driven layout with CSS decorative elements (gradient orbs, code snippets, geometric shapes)
- Branding placement with sufficient contrast (5.5:1 minimum), or omitted entirely when not requested

### Architecture Diagram

System architecture and technical diagrams with color-coded nodes, group boxes, and arrows.

- Layered, multi-stage, hierarchical, or single-column layouts
- Color-coded by function: services (blue), compute (green), infrastructure (amber), storage (indigo), external (pink)
- Focal component highlighting with blue ring
- Canvas sizes from 1200x630 up to 2400x1800

### Process Infographic

Step-by-step process and timeline infographics with vertical layouts and phase grouping.

- Numbered steps with phase headers
- Dark or light themes
- Canvas sizes from 1200x630 up to 1200x2400 for long pipelines

## Requirements

- Chrome or Chromium in PATH (used for headless screenshot rendering)

## Install

```bash
/plugin install visual-gen@eyay-toolkits
```
