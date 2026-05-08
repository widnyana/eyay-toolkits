# Cover Image Design Reference

Design rules specific to blog cover images and OG/social preview images at 1200x630px.

## Canvas Dimensions

Fixed at 1200x630 pixels (Open Graph standard). Always set exact pixel dimensions on `body` to prevent Chrome headless from guessing viewport size:

```css
body {
  width: 1200px;
  height: 630px;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
```

Never omit the `overflow: hidden` rule. Without it, content that exceeds 630px height will either get clipped unpredictably or expand the screenshot.

## Color Palettes

### Dark Backgrounds (Technical Topics)

Use for posts about programming, infrastructure, security, blockchain, or developer tooling.

| Element | Value | Usage |
|---------|-------|-------|
| Background | `#0f172a` (slate-900) | Primary background |
| Background alt | `#1e293b` (slate-800) | Card/section background |
| Primary text | `#f8fafc` (slate-50) | Title text |
| Secondary text | `#94a3b8` (slate-400) | Subtitle, metadata |
| Accent gradient | `#6366f1` to `#8b5cf6` | Decorative elements, highlights |
| Accent gradient alt | `#06b6d4` to `#3b82f6` | Secondary accent |
| Code/mono accent | `#22d3ee` (cyan-400) | Code-related visual hints |

### Light Backgrounds (General/Tutorial Topics)

Use for explanatory posts, tutorials, guides, or non-technical content.

| Element | Value | Usage |
|---------|-------|-------|
| Background | `#ffffff` | Primary background |
| Background alt | `#f8fafc` (slate-50) | Subtle section differentiation |
| Primary text | `#0f172a` (slate-900) | Title text |
| Secondary text | `#64748b` (slate-500) | Subtitle, metadata |
| Accent | `#3b82f6` (blue-500) | Decorative elements |
| Accent alt | `#8b5cf6` (violet-500) | Secondary accent |
| Border/divider | `#e2e8f0` (slate-200) | Subtle lines |

### Gradient Backgrounds (Hybrid/Feature Topics)

Use for feature announcements, series introductions, or posts spanning multiple topics.

Gradient direction: 135 degrees (top-left to bottom-right).

| Variant | Start Color | End Color |
|---------|-------------|-----------|
| Indigo-night | `#1e1b4b` | `#312e81` |
| Teal-depth | `#042f2e` | `#134e4a` |
| Warm-dark | `#1c1917` | `#44403c` |
| Slate-cool | `#0f172a` | `#334155` |

## Typography

### Font Loading

Load Google Fonts via `@import` in the `<style>` block. Max 2 fonts per cover:

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
```

Common font pairings:

| Display Font (Title) | Body Font (Metadata) | Use When |
|----------------------|---------------------|----------|
| Inter 800 | Inter 400 | Default choice, clean and legible |
| JetBrains Mono 700 | Inter 400 | Code/programming topics |
| Space Grotesk 700 | Inter 400 | Tech/modern feel |
| Outfit 700 | Inter 400 | Clean contemporary look |

### Size Scale for Covers

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Main title | 48-64px | 700-800 | Primary text color |
| Subtitle/tagline | 20-24px | 400-600 | Secondary text color |
| Series label | 14-16px | 600 | Accent color, uppercase |
| Author/site branding | 14-16px | 400 | Muted/secondary color |
| Tag/category | 12-14px | 600 | Accent color |

Title text should be large enough to read clearly when the image is displayed at 600px wide (half-size in social feeds). If the title is longer than 40 characters, shorten it for the cover rather than shrinking the font below 42px.

### Text Wrapping

Limit title to 2 lines maximum. If the title wraps to 3 lines, either shorten the title text or increase the font size and let the overflow hide. Use `line-height: 1.2` for titles to keep vertical space tight.

## Layout Zones

The 1200x630 canvas divides into three horizontal zones:

```
+--------------------------------------------------+
| Top zone (80px)    - Series label, tag, category  |
|                                                    |
| Center zone (400px) - Main title, subtitle,        |
|                        visual element              |
|                                                    |
| Bottom zone (80px)  - Author/site branding, date   |
+--------------------------------------------------+
```

The center zone carries the visual weight. Place the main title slightly above vertical center (optical center is above geometric center).

### Safe Margins

Maintain padding from all edges to prevent text clipping:

```css
.cover {
  padding: 60px 80px;
  box-sizing: border-box;
}
```

Minimum margins: 60px top/bottom, 80px left/right. Social platforms may crop edges, so critical text must stay within the inner 1040x510 area.

## Visual Elements

### CSS-Only Decorations

No external images. Use CSS shapes, gradients, and patterns:

- **Gradients:** Linear gradients for backgrounds and accent bars
- **Circles:** Large translucent circles with `border-radius: 50%` and low opacity as background decoration
- **Geometric shapes:** Triangles via CSS borders, rotated squares via `transform: rotate(45deg)`
- **Code blocks:** Styled `<pre>` or `<code>` blocks with monospace font and syntax-colored spans
- **Grid patterns:** `background-image` with repeating linear gradients for dot/grid patterns
- **Rounded rectangles:** Tag/badge shapes with `border-radius: 8px`

### Positioning Decorations

Place decorative elements in the background with `position: absolute` and `z-index: 0`. Content text sits at `z-index: 1` or higher. Use `opacity: 0.05-0.15` for background decorations to keep them subtle.

## Branding Placement

Author name or site URL goes in the bottom-right corner. Branding must be
legible — it is the only element that identifies the creator. Do not treat
branding as "barely visible" decoration.

### When branding is provided

Place branding inside the safe area (within 60px bottom margin) so it is not
cropped by social platforms. Use colors with sufficient contrast against the
background:

```css
.branding {
  position: absolute;
  bottom: 24px;
  right: 80px;
  font-size: 14px;
  font-weight: 500;
}
/* Dark backgrounds */
.branding { color: #94a3b8; }
/* Light backgrounds */
.branding { color: #64748b; }
```

Color rules:
- **Dark backgrounds**: use `#94a3b8` (slate-400). Minimum contrast ratio 5.5:1
  against `#0f172a`. Never use `rgba(255,255,255,0.3)` or lower — it is
  invisible on dark backgrounds.
- **Light backgrounds**: use `#64748b` (slate-500). Minimum contrast ratio 5.7:1
  against `#ffffff`. Never use `rgba(0,0,0,0.25)` — it is invisible on white.
- Never use opacity below 0.7 on branding text. If the color feels too
  prominent, switch to a muted solid color (like `#94a3b8`) rather than
  reducing opacity.

Positioning rules:
- `bottom` must be >= 20px and <= 50px (inside the safe area)
- `right` must be >= 80px (aligned with safe margin)
- Font size: 13-15px. Font weight: 400-500. Do not go below 13px.

### When branding is NOT provided

If the prompt does not include an author name, site URL, or brand identifier,
omit the `.branding` element entirely. Do not invent or guess branding text.
Leave the bottom-right area empty or extend decorative elements into that space.

## Choosing Dark vs Light

Decision criteria:

- **Dark background:** Programming, infrastructure, security, DevOps, blockchain, system design, debugging
- **Light background:** Tutorials, guides, conceptual explanations, career, soft skills, announcements
- **Gradient background:** Series introductions, cross-topic posts, feature launches

When in doubt, match the tone of the written content. A serious technical deep-dive should feel weighty (dark). A friendly beginner tutorial should feel approachable (light).
