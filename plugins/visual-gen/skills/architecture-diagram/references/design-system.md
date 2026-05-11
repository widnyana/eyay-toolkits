# Design System Reference

Full reference for the dark-theme architecture diagram design system. Consult this file for exact color values, SVG patterns, typography, and export toolbar internals.

## Color Palette

| Type | Fill (rgba) | Stroke | Use For |
|------|-------------|--------|---------|
| Frontend | `rgba(8, 51, 68, 0.4)` | `#22d3ee` (cyan-400) | Web apps, mobile clients, SPAs, React/Vue/Angular |
| Backend | `rgba(6, 78, 59, 0.4)` | `#34d399` (emerald-400) | API servers, microservices, workers, business logic |
| Database | `rgba(76, 29, 149, 0.4)` | `#a78bfa` (violet-400) | SQL, NoSQL, caches, object stores, queues |
| Cloud | `rgba(120, 53, 15, 0.3)` | `#fbbf24` (amber-400) | AWS/GCP/Azure managed services, CDN, S3, RDS |
| Security | `rgba(136, 19, 55, 0.4)` | `#fb7185` (rose-400) | Auth providers, WAFs, IAM, firewalls |
| Message Bus | `rgba(251, 146, 60, 0.3)` | `#fb923c` (orange-400) | Kafka, RabbitMQ, SQS, event buses, pub/sub |
| External | `rgba(30, 41, 59, 0.5)` | `#94a3b8` (slate-400) | Third-party APIs, SaaS, payment processors |

### Color assignment rules

Assign colors by function, not visual preference. If a component could fit multiple categories, choose based on primary role in the diagram context. Example: Redis as cache = Database; Redis as message broker between services = Message Bus.

## Typography

Font: JetBrains Mono (monospace, technical aesthetic).

```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Component name | 11-12px | 600 | `white` |
| Sublabel | 9px | 400 | `#94a3b8` (slate-400) |
| Annotation | 8px | 400 | `#94a3b8` |
| Tiny label | 7px | 400 | Component stroke color |
| Boundary label | 10px | 600 | Boundary stroke color |
| Legend text | 8px | 400 | `#94a3b8` |
| Legend header | 10px | 600 | `white` |

## SVG Patterns

### Background grid

```svg
<pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" stroke-width="0.5"/>
</pattern>
<rect width="100%" height="100%" fill="url(#grid)" />
```

Background color: `#020617` (slate-950).

### Arrowhead marker

```svg
<marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
  <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
</marker>
```

### Standard arrow with label

```svg
<line x1="X1" y1="Y1" x2="X2" y2="Y2" stroke="#64748b" stroke-width="1.5" marker-end="url(#arrowhead)"/>
<text x="MID_X" y="LABEL_Y" fill="#94a3b8" font-size="9" text-anchor="middle">HTTPS</text>
```

### Auth/security flow (dashed)

```svg
<path d="M X1 Y1 L X2 Y2" fill="none" stroke="#fb7185" stroke-width="1.5" stroke-dasharray="5,5"/>
<text x="MID_X" y="LABEL_Y" fill="#fb7185" font-size="8">JWT</text>
```

### Cloud region boundary

```svg
<rect x="X" y="Y" width="W" height="H" rx="12" fill="rgba(251, 191, 36, 0.05)" stroke="#fbbf24" stroke-width="1" stroke-dasharray="8,4"/>
<text x="X+12" y="Y+18" fill="#fbbf24" font-size="10" font-weight="600">AWS Region: us-west-2</text>
```

### Security group boundary

```svg
<rect x="X" y="Y" width="W" height="H" rx="8" fill="transparent" stroke="#fb7185" stroke-width="1" stroke-dasharray="4,4"/>
<text x="X+8" y="Y+14" fill="#fb7185" font-size="8">sg-name :port</text>
```

### Message bus connector

Place between vertically stacked components, inside the gap:

```svg
<rect x="X" y="Y" width="120" height="20" rx="4" fill="rgba(251, 146, 60, 0.3)" stroke="#fb923c" stroke-width="1"/>
<text x="CENTER_X" y="Y+14" fill="#fb923c" font-size="7" text-anchor="middle">Kafka / RabbitMQ</text>
```

### Component with opaque mask (arrow-proof)

```svg
<!-- Opaque background to mask arrows underneath -->
<rect x="X" y="Y" width="W" height="H" rx="6" fill="#0f172a"/>
<!-- Styled component on top -->
<rect x="X" y="Y" width="W" height="H" rx="6" fill="rgba(76, 29, 149, 0.4)" stroke="#a78bfa" stroke-width="1.5"/>
```

### Multi-line component

```svg
<rect x="200" y="380" width="110" height="100" rx="6" fill="rgba(120, 53, 15, 0.3)" stroke="#fbbf24" stroke-width="1.5"/>
<text x="255" y="400" fill="white" font-size="11" font-weight="600" text-anchor="middle">S3 Buckets</text>
<text x="255" y="420" fill="#94a3b8" font-size="8" text-anchor="middle">- bucket-one</text>
<text x="255" y="434" fill="#94a3b8" font-size="8" text-anchor="middle">- bucket-two</text>
<text x="255" y="448" fill="#94a3b8" font-size="8" text-anchor="middle">- bucket-three</text>
<text x="255" y="466" fill="#fbbf24" font-size="7" text-anchor="middle">OAI Protected</text>
```

## Legend Pattern

```svg
<text x="X" y="Y" fill="white" font-size="10" font-weight="600">Legend</text>

<rect x="X" y="Y+12" width="16" height="10" rx="2" fill="rgba(8, 51, 68, 0.4)" stroke="#22d3ee" stroke-width="1"/>
<text x="X+22" y="Y+20" fill="#94a3b8" font-size="8">Frontend</text>

<rect x="X" y="Y+28" width="16" height="10" rx="2" fill="rgba(6, 78, 59, 0.4)" stroke="#34d399" stroke-width="1"/>
<text x="X+22" y="Y+36" fill="#94a3b8" font-size="8">Backend</text>

<line x1="X" y1="Y+48" x2="X+16" y2="Y+48" stroke="#fb7185" stroke-width="1" stroke-dasharray="3,3"/>
<text x="X+22" y="Y+51" fill="#94a3b8" font-size="8">Auth Flow</text>
```

## Info Card Pattern

```html
<div class="card">
  <div class="card-header">
    <div class="card-dot COLOR"></div>
    <h3>Title</h3>
  </div>
  <ul>
    <li>- Item one</li>
    <li>- Item two</li>
  </ul>
</div>
```

Available dot colors: `.cyan`, `.emerald`, `.violet`, `.amber`, `.rose`.

## Export Toolbar Internals

The template includes a built-in export toolbar. Preserve these elements when generating diagrams.

### CDN scripts (pinned with SRI)

```html
<script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"
  integrity="sha384-ZZ1pncU3bQe8y31yfZdMFdSpttDoPmOZg2wguVK9almUodir1PghgT0eY7Mrty8H"
  crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js"
  integrity="sha384-en/ztfPSRkGfME4KIm05joYXynqzUgbsG5nMrj/xEFAHXkeZfO3yMK8QQ+mP7p1/"
  crossorigin="anonymous"></script>
```

SRI hashes are tamper-resistant. Do not modify; if upgrading a CDN version, compute a fresh hash.

### Required markup

- `id="report-container"` on the outermost `.container` div (capture target)
- `.toolbar` div with `.toolbar-actions` and `.toolbar-toggle`
- `@media print { .toolbar { display: none !important; } }` in CSS

### Capture configuration

All three export functions use the same `html2canvas` call:

```javascript
const el = document.getElementById('report-container');
const r = el.getBoundingClientRect();
const pad = 32;
html2canvas(document.body, {
  backgroundColor: '#020617',
  scale: 2,
  useCORS: true,
  ignoreElements: (e) => e.classList && e.classList.contains('toolbar'),
  x: r.left + window.scrollX - pad,
  y: r.top + window.scrollY - pad,
  width: r.width + pad * 2,
  height: r.height + pad * 2
});
```

### Caveats

- Clipboard API requires a user gesture and secure context (https/file/localhost)
- SVG `<foreignObject>` renders inconsistently in html2canvas; use plain `<svg>` shapes and `<text>` only
- Bump `scale: 2` to `3` or `4` for higher-resolution output
- PDF uses PNG embedded via jsPDF with automatic landscape/portrait orientation
