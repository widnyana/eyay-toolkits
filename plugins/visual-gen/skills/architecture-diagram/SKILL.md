---
name: architecture-diagram
description: |
  This skill should be used when the user asks to "create a diagram",
  "make an architecture diagram", "design a system diagram",
  "draw an architecture", "create a technical diagram",
  "make a deployment diagram", "visualize infrastructure",
  "create a data flow diagram", "draw system components",
  "make a network diagram", or mentions architecture, system design,
  infrastructure diagrams, component relationships, or data flow.
  Do NOT trigger for cover images or step-by-step process flows.
version: 0.1.0
---

# Architecture Diagram Generator

Generate system architecture and technical diagrams as PNG by writing
HTML+CSS and rendering through Chrome headless. Diagrams follow a
clean, professional style: white background, color-coded nodes by
function, dashed borders for logical groupings, solid arrows with
triangular heads, and numbered steps for sequential processes.

## Overview

The architecture-diagram skill produces static PNG images from
hand-crafted HTML+CSS. Every diagram is self-contained in a single HTML
file, rendered at a fixed viewport of 1200x900 pixels. The visual style is deliberately simple: flat
color fills, no gradients, no shadows (except the highlight ring), and
the Inter typeface throughout.

The workflow is: understand the system, copy the template, adapt nodes
and layout, apply color coding, capture via the screenshot script, then
verify the result. All references to shared resources use local paths
within this skill directory.

## Detailed Workflow

### Step 1: Understand the system

Before writing any HTML, identify the following from the user request or
source content:

- **Components**: What servers, services, databases, queues, and
  external systems are involved?
- **Data flow**: In what direction does data or requests move? Top-down,
  left-to-right, or mixed?
- **Groupings**: Which components belong together? (e.g., "App Tier",
  "Data Layer", "External Services")
- **Focal element**: Which single component is the main subject of the
  diagram? This element gets the `.highlight` class.
- **Number of stages**: Is this a single snapshot or a multi-stage
  evolution (e.g., "v1 to v4 scaling")?

Read the source blog post or design document if the diagram is for a
specific article. Extract component names, descriptions, and
relationships before writing any markup.

### Step 2: Start from the template

Copy `examples/diagram-template.html` as a starting point. The template
includes all CSS classes (node, db, group, arrow, stage, connector) and
a four-stage multi-column layout. Adapt it by:

- Replacing the header title and subtitle with the actual diagram title
- Removing or adding stages to match the number of distinct sections
- Replacing node labels and descriptions with actual system components
- Adding or removing group boxes to reflect logical boundaries
- Applying the `.highlight` class to the focal component
- Adjusting padding and gaps if stages have different numbers of nodes

Do not start from a blank file. The template already has the correct
viewport size, font import, base styles, and badge positioning.

### Step 3: Apply color coding

Assign a CSS class to each node based on its functional category. Every
node must have exactly one category class and optionally the
`.highlight` class.

| Category | CSS Class | Fill | Border | Use For |
|----------|-----------|------|--------|---------|
| Service/App | `.service` | `#dbeafe` | `#93c5fd` | API services, microservices, app servers |
| Server/Compute | `.server` | `#dcfce7` | `#86efac` | Web servers, workers, compute instances |
| Infrastructure | `.infra` | `#fef3c7` | `#fcd34d` | Load balancers, gateways, routers, proxies |
| Storage/DB | `.storage` | `#e0e7ff` | `#a5b4fc` | Databases, caches, file storage, queues |
| External | `.external` | `#fce7f3` | `#f9a8d4` | CDN, third-party APIs, external services |

The `.highlight` modifier adds a blue border and subtle glow to draw
attention to the focal node. Apply it alongside the category class:
`<div class="node service highlight">`.

Color consistency matters more than color variety. If three nodes are
all application services, give all three the `.service` class rather than
spreading them across different colors for visual variety.

### Step 4: Choose a layout pattern

Select the layout pattern that best fits the system being diagrammed.
See the Layout Patterns section below for full details on each pattern
and when to use it.

### Step 5: Write to a temp file

Save the adapted HTML to a `tmp/` directory in the current project.
Use a descriptive filename like `tmp/solana-deployment-pipeline.html`.

### Step 6: Capture the screenshot

Run the screenshot script to render the HTML to PNG:

```bash
bash scripts/screenshot.sh tmp/diagram.html output/path/diagram.png
```

The script accepts optional width and height arguments:
```bash
bash scripts/screenshot.sh tmp/diagram.html output/diagram.png 1200 900
```

The script requires `google-chrome`, `google-chrome-stable`,
`chromium-browser`, or `chromium` in PATH. It runs Chrome in headless
mode with GPU and sandbox disabled.

### Step 7: Verify the output

Read the generated PNG file to check alignment, readability, and
completeness. Verify that:

- All labels are readable (no overlapping text)
- Arrows connect the correct nodes
- The focal element stands out visually
- Group boxes contain all intended children
- No content is clipped by the viewport boundary
- Text is not cut off or wrapping unexpectedly

Fix and re-capture if any issues are found.

### Step 8: Clean up

Remove the temp HTML file after confirming the PNG is correct. Do not
leave build artifacts in the project directory.

## Node Types

### Regular node

Rounded rectangle with a category-based fill color, a label, and an
optional description. This is the most common node type.

**HTML:**
```html
<div class="node service">
  <div class="node-label">App Server</div>
  <div class="node-desc">Business logic</div>
</div>
```

**CSS:**
```css
.node {
  border-radius: 6px;
  padding: 10px 16px;
  text-align: center;
  min-width: 120px;
  border: 1.5px solid transparent;
  margin-bottom: 10px;
}
.node.service { background: #dbeafe; border-color: #93c5fd; }
.node.server  { background: #dcfce7; border-color: #86efac; }
.node.infra   { background: #fef3c7; border-color: #fcd34d; }
.node.storage { background: #e0e7ff; border-color: #a5b4fc; }
.node.external { background: #fce7f3; border-color: #f9a8d4; }
.node-label {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.3;
}
.node-desc {
  font-size: 10px;
  color: #555;
  margin-top: 2px;
}
```

### Database cylinder

A rounded rectangle with a CSS pseudo-element ellipse at the top,
simulating a cylinder shape. Always uses the storage color family.

**HTML:**
```html
<div class="db">
  <div class="db-label">PostgreSQL</div>
  <div class="db-desc">Primary + Replica</div>
</div>
```

**CSS:**
```css
.db {
  background: #f0f4ff;
  border: 1.5px solid #a5b4fc;
  border-radius: 6px;
  padding: 8px 16px 12px;
  text-align: center;
  min-width: 110px;
  position: relative;
  margin-bottom: 10px;
}
.db::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 70%;
  height: 6px;
  background: #e0e7ff;
  border: 1.5px solid #a5b4fc;
  border-bottom: none;
  border-radius: 50% 50% 0 0;
}
.db-label {
  font-size: 11px;
  font-weight: 600;
  color: #1a1a2e;
  margin-top: 4px;
}
.db-desc {
  font-size: 9px;
  color: #555;
}
```

### Group box

Dashed-border rectangle that groups related nodes. The label sits at the
top-left corner, breaking through the border, with a white background
behind the text.

**HTML:**
```html
<div class="group">
  <span class="group-label">App Tier</span>
  <div class="node service">
    <div class="node-label">API Server</div>
  </div>
  <div class="node server">
    <div class="node-label">Worker</div>
  </div>
</div>
```

**CSS:**
```css
.group {
  border: 1.5px dashed #bbb;
  border-radius: 8px;
  padding: 14px 12px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  position: relative;
}
.group-label {
  position: absolute;
  top: -9px;
  left: 12px;
  background: #fff;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
```

### Arrow (vertical, CSS-drawn)

A shaft and triangular head drawn with pure CSS. Used for vertical
connections between nodes within the same column or stage.

**HTML:**
```html
<div class="arrow-down">
  <div class="label">HTTP</div>
  <div class="shaft"></div>
  <div class="head"></div>
</div>
```

**CSS:**
```css
.arrow-down {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 4px 0;
  color: #555;
  font-size: 11px;
  line-height: 1;
}
.arrow-down .shaft {
  width: 1.5px;
  height: 16px;
  background: #555;
}
.arrow-down .head {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #555;
}
.arrow-down .label {
  font-size: 9px;
  color: #888;
  margin-bottom: 2px;
}
```

### Arrow (horizontal, Unicode)

For stage-to-stage flow in multi-column layouts, use positioned Unicode
arrows. These sit between columns at the vertical midpoint.

**CSS:**
```css
.connector-h {
  position: absolute;
  top: 50%;
  right: -18px;
  display: flex;
  align-items: center;
  color: #2d8659;
  font-size: 18px;
  font-weight: 700;
}
```

**HTML:**
```html
<div class="connector-h">&rarr;</div>
```

Use `&rarr;` for single direction, `&harr;` for bidirectional, or
`&rArr;` for emphasis.

### Step number indicator

Green numbered circle for sequential or multi-stage diagrams.

**HTML:**
```html
<div class="stage-number">1</div>
```

**CSS:**
```css
.stage-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #2d8659;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}
```

### Highlight modifier

Apply `.highlight` to the focal component to add a blue ring around the
node. Use alongside any category class:

```html
<div class="node service highlight">
  <div class="node-label">Focal Service</div>
</div>
```

```css
.node.highlight {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}
```

## Color Coding Reference

Assign colors by function, not by visual preference. Consistency across
diagrams in the same project or blog series aids comprehension.

| Category | Fill | Border | When to Use |
|----------|------|--------|-------------|
| Service/App `.service` | `#dbeafe` | `#93c5fd` | Application-layer services: REST APIs, GraphQL servers, gRPC services, business logic containers |
| Server/Compute `.server` | `#dcfce7` | `#86efac` | Infrastructure compute: web servers, VMs, container instances, serverless functions, worker processes |
| Infrastructure `.infra` | `#fef3c7` | `#fcd34d` | Network and routing: load balancers, API gateways, reverse proxies, DNS, CDN edge nodes, firewalls |
| Storage/DB `.storage` | `#e0e7ff` | `#a5b4fc` | Data persistence: relational databases, NoSQL stores, caches, message queues, object storage |
| External `.external` | `#fce7f3` | `#f9a8d4` | Third-party or out-of-scope: external APIs, SaaS services, payment processors, cloud provider services |
| Highlight `.highlight` | (inherits) | `#3b82f6` | The single focal component under discussion. Apply to one node per diagram. |

When a node could fit multiple categories, choose based on the primary
role in the diagram's context. For example, a Redis instance acting as a
cache is `.storage`; a Redis instance acting as a message broker between
services is `.infra`.

## Layout Patterns

### Single-column flow (top-down)

Use for simple request/response flows, CI/CD pipelines, or linear data
processing chains. Nodes stack vertically with arrows between them.

```
[Load Balancer]
      |
   [App Server]
      |
    [Database]
```

**When to use:** Fewer than 6 components, single path, no branching.
Set `.diagram` to `flex-direction: column` and center-align all nodes.

### Multi-stage (left-to-right)

Use for system evolution diagrams, deployment pipelines, or comparisons
across stages. Each stage is a vertical column; stages flow left to
right.

```
[Stage 1] -> [Stage 2] -> [Stage 3]
  Node A       Node D       Node G
    |            |            |
  Node B       Node E       Node H
```

**When to use:** 2-5 distinct stages, each with 2-5 components. This
is the layout used in `examples/diagram-template.html`. Use
`.connector-h` for arrows between stages.

### Hierarchical (tree)

Use for organizational charts, DNS hierarchy, or tree-shaped data
flows. Parent nodes sit above child nodes, connected by vertical arrows.

```
         [Root]
        /      \
    [Child A]  [Child B]
       |
   [Leaf A1]
```

**When to use:** Clear parent-child relationships, branching but no
cycles. Use flex row for sibling groups and flex column for depth
levels.

### Layered (stacked rows)

Use for network topology, layered architecture (presentation, business,
data), or security zones. Each layer is a horizontal row spanning the
full width.

```
[--- Presentation Layer ---]
  [Web App]    [Mobile App]
[--- Business Layer ---]
  [API Server] [Worker]
[--- Data Layer ---]
  [DB Primary] [Cache]
```

**When to use:** Clear horizontal tiers with distinct responsibilities.
Each row is a group box with a descriptive label. Use group boxes with
solid or dashed borders to delineate layers.

## Template Usage Guide

The file `examples/diagram-template.html` is a complete, working
four-stage architecture diagram. Use it as follows:

1. Copy the entire file to `tmp/` in the project directory.
2. Edit the title and subtitle in the `.header` div.
3. For each stage, update the stage number, stage title, and contained
   nodes.
4. Add or remove stages by duplicating or deleting `.stage` blocks.
5. Adjust `.connector-h` elements between stages.
6. Apply `.highlight` to the focal node.
7. Update the badge text or remove it entirely.
8. Save and render with `scripts/screenshot.sh`.

The template includes all CSS inline in a `<style>` block. No external
stylesheets are needed except the Google Fonts import for Inter.

Do not remove the `body` width/height/overflow styles. These are
required for Chrome headless to render at the correct viewport size.

## Common Issues and Troubleshooting

### Content clipped at edges

Symptom: Nodes or text are cut off at the right or bottom edge.

Cause: Content exceeds the 1200x900 viewport.

Fix: Reduce node padding, decrease font sizes, or increase the body
height and pass custom dimensions to the screenshot script:
```bash
bash scripts/screenshot.sh tmp/diagram.html out.png 1200 900
```

### Text overlapping

Symptom: Labels or descriptions overlap adjacent nodes.

Cause: Nodes are too close together or text is too long.

Fix: Increase gap between flex children, shorten labels to 1-3 words,
or reduce `min-width` on nodes. Avoid node descriptions longer than 4
words.

### Chrome not found

Symptom: `error: no Chrome/Chromium binary found in PATH`.

Cause: Chrome or Chromium is not installed or not in PATH.

Fix: Install Chrome or Chromium. On Debian/Ubuntu:
```bash
sudo apt install chromium-browser
```
On Fedora:
```bash
sudo dnf install chromium
```
On macOS: Install Google Chrome from the website or via Homebrew:
```bash
brew install --cask google-chrome
```

### Database cylinder cap misaligned

Symptom: The elliptical top cap on a `.db` node is shifted left or right.

Cause: The `::before` pseudo-element uses `left: 50%; transform:
translateX(-50%)`, which depends on the parent having
`position: relative`.

Fix: Ensure `.db` has `position: relative` set.

### Font not loading

Symptom: Diagram renders with fallback font instead of Inter.

Cause: Google Fonts CDN is unreachable during headless rendering, or
the `@import` is not at the top of the `<style>` block.

Fix: Ensure the `@import url(...)` line is the first rule in the
`<style>` block. If offline rendering is required, download the Inter
font files and use `@font-face` declarations with local paths.

### Group label not breaking the border

Symptom: The group label text overlaps the dashed border rather than
sitting cleanly above it.

Cause: The `.group-label` requires `background: #fff` to hide the
border behind the text.

Fix: Verify that `.group-label` has `background: #fff` and sufficient
`padding: 0 6px` to cover the border width.

### Screenshot is blank or white

Symptom: The output PNG is entirely white with no content.

Cause: Body dimensions are missing, or all content is positioned
outside the viewport.

Fix: Verify that `body` has explicit `width: 1200px; height: 900px` and
`overflow: hidden`. Check that child elements are positioned within
these bounds.

## Quick Reference

### File locations

| Resource | Path |
|----------|------|
| Diagram template | `examples/diagram-template.html` |
| Screenshot script | `scripts/screenshot.sh` |
| Style reference | `references/diagram-styles.md` |

### Screenshot command

```bash
bash scripts/screenshot.sh <input.html> <output.png> [width] [height]
```

### Node class reference

| Class | Purpose |
|-------|---------|
| `.node .service` | Application services |
| `.node .server` | Compute instances |
| `.node .infra` | Infrastructure (LB, gateway) |
| `.node .storage` | Storage and databases |
| `.node .external` | Third-party services |
| `.db` | Database cylinder shape |
| `.group` | Dashed-border grouping |
| `.highlight` | Blue ring on focal node |
| `.arrow-down` | Vertical CSS arrow |
| `.connector-h` | Horizontal Unicode arrow |
| `.stage-number` | Green numbered circle |

### Canvas sizes

| Type | Dimensions |
|------|-----------|
| Standard diagram | 1200 x 900 |
| Tall diagram | 1200 x 1200 |

### Color cheat sheet

- Blue `#dbeafe` = service/app
- Green `#dcfce7` = server/compute
- Amber `#fef3c7` = infrastructure
- Indigo `#e0e7ff` = storage/database
- Pink `#fce7f3` = external
- Green step `#2d8659` = step indicator
- Blue ring `#3b82f6` = highlight border

## Additional Resources

### Reference files

- **`references/diagram-styles.md`** - Complete style reference
  including all color values, typography scale, arrow patterns, and
  canvas dimensions.

### Example files

- **`examples/diagram-template.html`** - Complete four-stage
  architecture diagram template with all CSS classes. Copy this file
  as the starting point for every new diagram.

### Utility scripts

- **`scripts/screenshot.sh`** - Chrome headless capture utility.
  Accepts input HTML path, output PNG path, and optional viewport
  dimensions.
