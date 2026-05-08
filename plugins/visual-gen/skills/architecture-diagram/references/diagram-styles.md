# Diagram Styles Reference

## Color Coding Table

| Category | Fill | Border | CSS Class | Use For |
|----------|------|--------|-----------|---------|
| Service/App | `#dbeafe` | `#93c5fd` | `.service` | Application servers, API services, microservices |
| Server/Compute | `#dcfce7` | `#86efac` | `.server` | Web servers, compute nodes, workers |
| Infrastructure | `#fef3c7` | `#fcd34d` | `.infra` | Load balancers, gateways, routers, proxies |
| Storage/DB | `#e0e7ff` | `#a5b4fc` | `.storage` | Databases, caches, file storage, queues |
| External | `#fce7f3` | `#f9a8d4` | `.external` | CDN, third-party APIs, external services |
| Highlight | inherits | `#3b82f6` | `.highlight` | Focal component, the element under discussion |

## Text Colors

| Role | Color | Usage |
|------|-------|-------|
| Primary | `#1a1a2e` | Node labels, titles |
| Secondary | `#555555` | Node descriptions, body text |
| Tertiary | `#888888` | Group labels, arrow labels, muted text |
| Subtitle | `#666666` | Diagram subtitles |

## Step Indicators

Green numbered circles for sequential diagrams:

- Fill: `#2d8659`
- Text: white, 13px, weight 700
- Size: 28x28px (standard), 36x36px (infographic)

## Typography

Font stack: `"Inter", "Helvetica Neue", Arial, sans-serif`

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Title | 22px | 700 | `#1a1a2e` |
| Subtitle | 13px | 400 | `#666` |
| Node label | 12px | 600 | `#1a1a2e` |
| Node description | 10px | 400 | `#555` |
| Group label | 10px | 600 | `#888`, uppercase |
| Arrow label | 9px | 400 | `#888` |
| DB label | 11px | 600 | `#1a1a2e` |
| DB description | 9px | 400 | `#555` |
| Badge/watermark | 10px | 500 | `#aaa` |

## Canvas Dimensions

| Type | Width | Height |
|------|-------|--------|
| Diagram | 1200px | 900px |
| Cover image | 1200px | 630px |
| Infographic | 1200px | 900px or 1200px |

Always set exact pixel dimensions on `body`:
```css
body { width: 1200px; height: 900px; overflow: hidden; }
```

## Arrow Styles

### Vertical (CSS-drawn)
- Shaft: 1.5px wide, 16px tall, background `#555`
- Head: CSS border triangle, 4px sides, color `#555`

### Horizontal (Unicode)
- `->` for single direction between stages
- `<->` for bidirectional
- `=>` for emphasis

### Connector positioning
For stage-to-stage connectors, position absolutely at vertical center, right edge:
```css
.connector-h {
  position: absolute;
  top: 50%;
  right: -18px;
  font-size: 18px;
  color: #2d8659;
}
```

## Highlight Pattern

To draw attention to the focal component of the diagram, add `.highlight` class alongside the category class:

```css
.node.highlight {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}
```

Usage: `<div class="node service highlight">` applies blue border with subtle glow around the node, keeping the service-category fill color.

## Group Box Rules

- Dashed border (`1.5px dashed #bbb`) to distinguish from solid node borders
- Label positioned at top-left, breaking the border, with white background behind text
- Label text: uppercase, `10px`, `#888`
- Inner flex column layout with 8px gap between children
- Padding: 14px top, 12px horizontal, 10px bottom

## Database Cylinder Rules

The cylinder shape uses a standard `.db` class with a `::before` pseudo-element to simulate the elliptical top cap:

- Base: rounded rectangle with storage color fill
- Top cap: 70% width, 6px height, elliptical border-radius on top corners only
- Positioned absolutely at top center of the `.db` element
- Same border color as base (`#a5b4fc`), but no bottom border on the cap

## Background Colors

| Use | Color |
|-----|-------|
| Default canvas | `#FFFFFF` |
| Grouped/large diagrams | `#F5F5F5` |
| Badge/watermark text | `#aaa` |
