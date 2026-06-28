---
name: Interplanetary Mission Control
colors:
  surface: '#0f1321'
  surface-dim: '#0f1321'
  surface-bright: '#353849'
  surface-container-lowest: '#0a0d1c'
  surface-container-low: '#171b2a'
  surface-container: '#1b1f2e'
  surface-container-high: '#262939'
  surface-container-highest: '#303444'
  on-surface: '#dfe1f6'
  on-surface-variant: '#c8c4d8'
  inverse-surface: '#dfe1f6'
  inverse-on-surface: '#2c303f'
  outline: '#928ea1'
  outline-variant: '#474555'
  surface-tint: '#c5c0ff'
  primary: '#c5c0ff'
  on-primary: '#2500a1'
  primary-container: '#6d5ef9'
  on-primary-container: '#ffffff'
  inverse-primary: '#5543e0'
  secondary: '#7bd0ff'
  on-secondary: '#00354a'
  secondary-container: '#00a6e0'
  on-secondary-container: '#00374d'
  tertiary: '#ffb785'
  on-tertiary: '#502500'
  tertiary-container: '#b85d00'
  on-tertiary-container: '#fffeff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e4dfff'
  primary-fixed-dim: '#c5c0ff'
  on-primary-fixed: '#140067'
  on-primary-fixed-variant: '#3c21c8'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#ffdcc6'
  tertiary-fixed-dim: '#ffb785'
  on-tertiary-fixed: '#301400'
  on-tertiary-fixed-variant: '#713700'
  background: '#0f1321'
  on-background: '#dfe1f6'
  surface-variant: '#303444'
  surface-card: '#0B1020'
  success-green: '#00D084'
  warning-gold: '#FFB020'
  danger-red: '#F04438'
  border-white: rgba(255, 255, 255, 0.1)
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  grid-margin: 32px
  gutter: 16px
  widget-padding: 24px
  compact-padding: 12px
---

## Brand & Style
The design system is a high-fidelity, futuristic framework designed for mission-critical operations. It targets a technical audience—engineers, data scientists, and "protocol pioneers"—who require a high information density without sacrificing visual sophistication.

The style is **Glassmorphic-Industrial**. It merges the clean, functional minimalism of modern SaaS (Linear/Vercel) with the atmospheric depth of deep-space telemetry. The interface should feel like a heads-up display (HUD) projected onto a sleek, obsidian-glass surface. Key characteristics include:
- **Atmospheric Depth:** Multi-layered translucency with heavy backdrop blurs.
- **Precision:** Ultra-thin "laser-cut" borders and monospaced data readouts.
- **Luminescence:** Interactive elements emit a soft "micro-glow," simulating self-illuminated hardware.

## Colors
The palette is rooted in the "Deep Space" (#050816) void, providing maximum contrast for functional accents.

- **Background:** Strictly #050816. Do not use pure black; the slight navy tint maintains "infinite depth."
- **Surfaces:** Cards and panels use #0B1020 at 80% opacity with a 12px-20px backdrop blur.
- **Accents:** Accent Purple is the primary action color. Laser Blue is used for secondary telemetry and data visualization.
- **Semantic Colors:** Success, Warning, and Danger colors are highly saturated to ensure immediate recognition against the dark backdrop. They should always be accompanied by a 4-8px outer glow when active or in an error state.

## Typography
Typography is a hierarchy of intent. 

1. **Space Grotesk** is used for structural headings and brand-moments. It provides a geometric, futuristic rhythm.
2. **Inter** handles the heavy lifting for documentation and prose, ensuring long-form readability.
3. **JetBrains Mono** is the "working" font. It is used for all numerical data, timestamps, protocol addresses, and status labels. 

Always use `label-caps` for high-contrast metadata descriptors (e.g., "SYSTEM STATUS: NOMINAL").

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model.
- **Desktop:** 12-column grid. Main navigation resides in a narrow left sidebar (64px collapsed, 240px expanded). Primary widgets exist in a fluid central area, while "Control Panels" are docked to the right.
- **Spacing Rhythm:** Based on an 8px scale. Use 24px (3 units) for internal card padding and 16px (2 units) for element grouping.
- **Modular Widgets:** Elements should appear as "floating" panels. Content is reflowed using a masonry-style logic for telemetry dashboards, ensuring data density remains high.

## Elevation & Depth
In this system, depth is achieved through **optical transparency** rather than traditional shadows.
- **Level 1 (Base):** The Deep Space background.
- **Level 2 (Panels):** Surface Cards with 1px `border-white/10`. These should appear to float via a 40px backdrop-blur filter.
- **Level 3 (Interactive):** Hovering over a card or button triggers a "Micro-Glow"—a box-shadow using the primary or secondary color at 20% opacity with a large blur (20px) and zero spread.
- **Overlays:** Modals use a darker, 90% opaque background to "dim" the console behind them.

## Shapes
The shape language is "Soft-Industrial." While the aesthetic is technical, we avoid sharp 0px corners to prevent the UI from feeling aggressive. 
- **Standard Radius:** 4px (Soft) for most components.
- **Large Components:** 8px (rounded-lg) for main containers and widgets.
- **Interactive Pills:** Tags and status indicators use a full 100px pill radius to distinguish them from structural data containers.

## Components
- **Buttons:** Primary buttons use a solid Accent Purple fill with white text. Secondary buttons use a transparent background with the Laser Blue border and a subtle inner-glow on hover.
- **Input Fields:** Use a #050816 background to "sink" into the surface. On focus, the 1px border transitions from `white/10` to `Laser Blue` with a 4px outer glow.
- **Telemetry Cards:** Must feature a `label-caps` header and a `JetBrains Mono` value readout. Graphs within cards should use the Laser Blue and Accent Purple for data lines.
- **Status Chips:** High-contrast pills. For "Success," use Success Green text with a 10% opacity green background and a 1px solid green border.
- **Glass-Scrollbars:** Scrollbars are minimal (4px wide), using a `white/20` thumb that glows slightly when active.