---
name: architecture-diagram
description: |
  This skill should be used when the user asks to "create a diagram",
  "make an architecture diagram", "design a system diagram",
  "draw an architecture", "create a technical diagram",
  "make a deployment diagram", "visualize infrastructure",
  "create a data flow diagram", "draw system components",
  "make a network diagram", "diagram a cloud architecture",
  "draw an AWS diagram", "create a Kubernetes diagram", or mentions
  architecture, system design, infrastructure diagrams, component
  relationships, or data flow. Do NOT trigger for cover images,
  step-by-step process flows, or infographics.
version: 1.4.0
---

# Architecture Diagram

End-to-end architecture diagram generation. Gathers system information, produces an HTML file, renders it to PNG via Chrome headless, and delivers the final image. The entire export is automated -- the user never needs to open a browser or run a script manually.

Two visual styles: **dark theme** (default, SVG-based) and **light theme** (div-based, print-friendly).

## Workflow

### Step 1: Gather information

Before writing markup, identify from the request (ask clarifying questions if anything is ambiguous):

- **Components**: servers, services, databases, queues, external systems
- **Data flow**: direction of requests (top-down, left-to-right, mixed)
- **Groupings**: which components belong together (VPC, cluster, tier)
- **Boundary types**: cloud regions, security groups, Kubernetes namespaces
- **Theme**: dark (default) or light (for print/slides/white-background docs)
- **Output path**: where to save the final PNG (default: `tmp/` in the project directory)

When the request references a blog post or design document, read it and extract component names and relationships before writing markup.

Ask the user for clarification only when the system description is genuinely ambiguous. Do not ask questions that can be reasonably inferred.

### Step 2: Select style and start the file

**Dark theme (default):** Copy `resources/template.html` as the starting point. Includes inline SVG, CSS, grid background, arrowhead marker, export toolbar stub, and example component patterns.

**Light theme:** Build from the patterns in `references/diagram-styles.md`. Div-based layout with CSS classes (`.node .service`, `.db`, `.group`), Inter font, white `#FFFFFF` background.

For either style, do not start from a blank file. Save the working HTML to `tmp/` with a descriptive filename (e.g., `tmp/my-project-architecture.html`).

### Step 3: Place components

**Dark theme:** SVG `<rect>` + `<text>` pairs.

**Light theme:** div elements with category CSS classes.

Assign colors by semantic type:

| Type | Dark Stroke | Light Class | Use For |
|------|------------|-------------|---------|
| Frontend | `#22d3ee` (cyan) | `.service` | Web apps, mobile clients, SPAs |
| Backend | `#34d399` (emerald) | `.server` | API servers, microservices, workers |
| Database | `#a78bfa` (violet) | `.storage` | SQL, NoSQL, caches, object stores |
| Cloud | `#fbbf24` (amber) | `.infra` | AWS/GCP/Azure managed services |
| Security | `#fb7185` (rose) | `.external` | Auth providers, WAFs, IAM |
| Message Bus | `#fb923c` (orange) | `.storage` | Kafka, RabbitMQ, SQS, event buses |
| External | `#94a3b8` (slate) | `.external` | Third-party APIs, CDN, SaaS |

For exact fill values, SVG code snippets, and light-theme CSS, consult:
- Dark theme: `references/design-system.md`
- Light theme: `references/diagram-styles.md`

### Step 4: Draw boundaries

- **Cloud regions / VPCs**: dashed rect (`stroke-dasharray="8,4"`), amber, `rx="12"`
- **Security groups**: dashed rect (`stroke-dasharray="4,4"`), rose, transparent fill
- **Kubernetes namespaces**: dashed rect, slate
- **Light theme**: `.group` class with dashed `#bbb` border

Place boundary labels at the top-left corner inside the boundary.

### Step 5: Connect with arrows

**Dark theme:** SVG `<line>` or `<path>` with `marker-end="url(#arrowhead)"`.
- Standard flow: solid lines, slate `#64748b`
- Auth/security: dashed (`stroke-dasharray="5,5"`), rose `#fb7185`

**Light theme:** CSS `.arrow-down` (shaft + triangle head) or `.connector-h` (Unicode arrows).

**Z-order (dark theme):** draw arrows after the background grid but before component boxes. SVG renders in document order. To mask arrows behind semi-transparent boxes, add an opaque `<rect fill="#0f172a">` beneath the styled rect. Full pattern in `references/design-system.md`.

### Step 6: Apply spacing rules

- Standard component height: 60px (services), 80-120px (larger)
- Minimum vertical gap: 40px
- Message bus connectors: place inside the gap, not overlapping boxes

```
Component A: y=70, height=60   -> ends at y=130
Gap:         y=130 to y=170    -> 40px gap, bus at y=140 (20px tall)
Component B: y=170, height=60  -> ends at y=230
```

### Step 7: Add legend

Place the legend OUTSIDE all boundary boxes. Calculate the lowest boundary edge, start the legend at least 20px below it. Extend the SVG viewBox (dark) or body height (light) if needed.

### Step 8: Render to PNG

After saving the HTML file, immediately render it to PNG using the screenshot script:

```bash
bash scripts/screenshot.sh tmp/diagram.html tmp/diagram.png
```

The script:
- Auto-detects canvas dimensions from the HTML body CSS (no need to pass width/height unless overriding)
- Requires `google-chrome`, `google-chrome-stable`, `chromium-browser`, or `chromium` in PATH
- On success, prints: `saved: <path> (<width>x<height>)`

Override dimensions when auto-detect fails or the diagram needs a specific size:

```bash
bash scripts/screenshot.sh tmp/diagram.html tmp/diagram.png 1200 900
```

**This step is mandatory.** Do not stop after writing the HTML. Always produce the PNG.

### Step 9: Verify the output

Read the generated PNG file and check:

- All labels readable (no overlapping text)
- Arrows connect correct components
- Boundaries contain all intended children
- No content clipped by viewport edges
- Legend is outside all boundaries
- Summary cards reflect the diagram content

If issues are found, fix the HTML and re-run Step 8.

### Step 10: Deliver

Report the exact file paths of both artifacts:

```
HTML: tmp/my-project-architecture.html
PNG:  tmp/my-project-architecture.png
```

The HTML file is the editable source. The PNG is the deliverable. Keep both unless the user asks to remove the HTML.

The dark-theme HTML also contains a browser-based export toolbar (Copy/PNG/PDF via html2canvas + jsPDF) for ad-hoc re-export. This is a convenience feature -- the primary export is always via `scripts/screenshot.sh`.

## Canvas Sizes

| Type | Dark (SVG viewBox) | Light (body px) |
|------|-------------------|-----------------|
| Standard | 1000 x 680 | 1200 x 900 |
| Wide | 1200 x 680 | 1200 x 900 |
| Tall | 1000 x 900 | 1200 x 1200 |

## Additional Resources

- **`resources/template.html`** -- Dark-theme template with all SVG patterns, CSS, grid background, and export toolbar. Copy to start every dark-theme diagram.
- **`examples/diagram-template.html`** -- Complete working example: three-tier web architecture with CDN, load balancer, API servers, cache, database, message bus, workers, and legend. Useful as a reference for layout and spacing.
- **`references/design-system.md`** -- Dark-theme design system: rgba fill values, typography scale, all SVG code patterns, boundary styles, legend pattern, export toolbar internals.
- **`references/diagram-styles.md`** -- Light-theme reference: CSS classes, node types, group boxes, database cylinder pattern, arrow styles, typography, canvas dimensions.
- **`scripts/screenshot.sh`** -- Chrome headless PNG capture. Auto-detects dimensions from HTML body CSS. Supports both themes.
