# Infographic Layout Patterns

Step-by-step CSS patterns for process infographics. All patterns target a fixed-dimension body with `overflow: hidden` and render via Chrome headless.

## Vertical Timeline

The default layout for process infographics. Steps flow top to bottom with a central or left-aligned connecting line.

```css
body {
  width: 1200px;
  height: 900px;
  overflow: hidden;
  margin: 0;
  padding: 0;
  font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
  background: #ffffff;
}

.container {
  padding: 48px 80px;
}

.timeline {
  position: relative;
  margin-left: 18px;
  padding-left: 32px;
  border-left: 2px solid #d1d5db;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 32px;
  position: relative;
}

.step-marker {
  position: absolute;
  left: -49px;
  top: 4px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #2d8659;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-title {
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 4px 0;
}

.step-desc {
  font-size: 12px;
  font-weight: 400;
  color: #555555;
  margin: 0;
  line-height: 1.5;
}
```

## Horizontal Phases

Steps grouped into horizontal phase blocks. Best for 3-5 high-level phases with sub-steps.

```css
.phases {
  display: flex;
  gap: 24px;
  padding: 48px 60px;
}

.phase {
  flex: 1;
  border: 1.5px dashed #d1d5db;
  border-radius: 8px;
  padding: 20px 16px;
  position: relative;
}

.phase-label {
  position: absolute;
  top: -10px;
  left: 14px;
  background: #ffffff;
  padding: 0 8px;
  font-size: 10px;
  font-weight: 600;
  color: #888888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.phase-step {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.phase-step-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #2d8659;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.phase-step-text {
  font-size: 12px;
  color: #1a1a2e;
  font-weight: 500;
}
```

## Grid Layout

Equal-sized cards in a grid. Works well for 4, 6, or 8 steps with short descriptions.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  padding: 48px 80px;
}

.grid-card {
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.grid-card-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2d8659;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.grid-card-title {
  font-size: 14px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0 0 4px 0;
}

.grid-card-desc {
  font-size: 11px;
  color: #555555;
  margin: 0;
  line-height: 1.4;
}
```

For 6+ steps, switch to 3 columns:

```css
.grid {
  grid-template-columns: repeat(3, 1fr);
}
```

## Phase Grouping (Vertical)

Wrap groups of timeline steps under labeled phase headers. Useful for multi-stage processes.

```css
.phase-group {
  margin-bottom: 36px;
}

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

.phase-group .step {
  margin-bottom: 24px;
}
```

Wrap steps in phase groups in the HTML:

```html
<div class="phase-group">
  <div class="phase-group-label">Phase 1: Setup</div>
  <div class="step">...</div>
  <div class="step">...</div>
</div>
<div class="phase-group">
  <div class="phase-group-label">Phase 2: Execution</div>
  <div class="step">...</div>
</div>
```

## Dimension Selection

Choose canvas dimensions based on step count to avoid crammed or oversized layouts.

| Step count | Width | Height | Layout          |
|------------|-------|--------|-----------------|
| 3-4        | 1200  | 630    | Vertical or grid (2x2) |
| 5-6        | 1200  | 900    | Vertical timeline |
| 7-9        | 1200  | 1200   | Vertical with phases |
| 10+        | 1200  | 1500   | Vertical with phases, smaller type |

General formula: `height = 630 + (steps_above_4 * 135)`, capped at 1500.

## Step Number Indicators

Numbered circles mark each step. Default uses green fill:

```css
.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #2d8659;
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
```

Alternative color for phase differentiation:

```css
.step-number.phase-a { background: #2563eb; }
.step-number.phase-b { background: #2d8659; }
.step-number.phase-c { background: #b45309; }
```

## Dark Theme

Swap background, text, and accent colors for dark-mode infographics.

```css
body {
  background: #0f172a;
  color: #e2e8f0;
}

.step-title {
  color: #f1f5f9;
}

.step-desc {
  color: #94a3b8;
}

.step-number {
  background: #06b6d4;
}

.timeline {
  border-left-color: #334155;
}

.phase-group-label {
  color: #06b6d4;
  border-bottom-color: #06b6d4;
}
```

## Typography Scale

Consistent sizing across all infographic layouts.

| Element        | Size  | Weight | Color     |
|----------------|-------|--------|-----------|
| Title          | 22px  | 700    | #1a1a2e   |
| Subtitle       | 13px  | 400    | #666666   |
| Step title     | 16px  | 700    | #1a1a2e   |
| Step desc      | 12px  | 400    | #555555   |
| Phase label    | 11px  | 700    | #2d8659   |
| Step number    | 14px  | 700    | #ffffff   |
| Grid card title| 14px  | 700    | #1a1a2e   |
| Grid card desc | 11px  | 400    | #555555   |

Dark theme overrides for text: primary `#f1f5f9`, secondary `#94a3b8`, muted `#64748b`.
