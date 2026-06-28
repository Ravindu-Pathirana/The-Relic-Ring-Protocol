# Frontend Rules — Relic Ring Protocol

## Stack & Tooling

| Tool | Purpose | Notes |
|------|---------|-------|
| Next.js 15 | Framework | App Router, `"use client"` for interactive pages |
| TypeScript | Type safety | Strict mode, no `any`, no `as` casts unless unavoidable |
| Tailwind CSS v4 | Styling | `@theme` block in `globals.css`, utility-first |
| Zustand | State management | One store per domain (universe, packets, network) |
| Material Symbols | Icons | `<span className="material-symbols-outlined">icon_name</span>` |

## Project Structure

```
src/
├── app/                    # Pages (App Router)
│   ├── layout.tsx          # Root layout (fonts, sidebar, topnav, main wrapper)
│   ├── page.tsx            # Redirect to /dashboard
│   ├── globals.css         # Design tokens, utility classes, animations
│   ├── dashboard/page.tsx  # Universe map + stats
│   ├── simulator/page.tsx  # Packet send + visualization
│   ├── journey/page.tsx    # Hop log history + detail
│   ├── analytics/page.tsx  # Latency breakdown charts
│   ├── codex/page.tsx      # Base conversion viewer
│   └── network/page.tsx    # Chaos testing + network graph
├── components/
│   ├── layout/             # Sidebar.tsx, TopNav.tsx
│   ├── shared/             # GlassCard, MetricCard, StatusBadge, etc.
│   ├── universe/           # PlanetNode, UniverseMap, ConnectionLine
│   ├── packet/             # PacketForm, HopTimeline, PacketAnimation
│   ├── codex/              # ConversionTable, BinaryStream, AsciiViewer
│   ├── latency/            # KpiCard, LatencyChart, BreakdownDonut
│   └── network/            # ChaosEngine, NodeRegistry, EventLog
├── lib/
│   └── api.ts              # All fetch calls — single source of truth
├── hooks/
│   └── useUniverse.ts      # Zustand store for universe state
├── types/
│   └── index.ts            # All interfaces — must match backend response shapes
└── styles/                 # (reserved for additional CSS modules if needed)
```

## Component Rules

### File Organization
- One component per file, filename matches export name
- Page components: `page.tsx` inside route directory
- Shared components: `components/shared/ComponentName.tsx`
- Domain components: `components/{domain}/ComponentName.tsx`

### Component Patterns
```tsx
// Always "use client" for interactive components
"use client";

// Imports: React, then libs, then local, then types
import { useState, useEffect } from "react";
import { fetchPlanets } from "@/lib/api";
import type { PlanetNode } from "@/types";

// Props interface above component
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: string;
  color?: "primary" | "secondary" | "tertiary" | "success" | "warning" | "danger";
}

export default function MetricCard({ label, value, icon, color = "primary" }: MetricCardProps) {
  // Component body
}
```

### State Management
- **Local state**: `useState` for component-only state (form inputs, UI toggles)
- **Zustand stores**: For data shared across components (universe, network state)
- **Server state**: Fetch in `useEffect` with loading/error handling
- Never store derived data — compute it with `useMemo`

### Data Fetching Pattern
```tsx
const [data, setData] = useState<T | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  let cancelled = false;
  fetchData()
    .then((result) => { if (!cancelled) setData(result); })
    .catch((err) => { if (!cancelled) setError(err.message); })
    .finally(() => { if (!cancelled) setLoading(false); });
  return () => { cancelled = true; };
}, []);
```

## Styling Rules

### Design System Classes (from globals.css)
| Class | Usage |
|-------|-------|
| `.glass-panel` | Blur background containers (sidebars, overlays) |
| `.glass-card` | Content cards with rounded-xl |
| `.hover-glow` | Micro-glow hover effect on interactive cards |
| `.text-display-lg` | 48px Space Grotesk bold — hero numbers |
| `.text-headline-lg` | 32px Space Grotesk — page titles |
| `.text-headline-sm` | 20px Space Grotesk — section titles |
| `.text-body-md` | 16px Inter — body text |
| `.text-body-sm` | 14px Inter — secondary text |
| `.text-data-mono` | 14px JetBrains Mono — data readouts |
| `.text-label-caps` | 11px JetBrains Mono UPPERCASE — labels |

### Color Usage
| Color | CSS Class | When to Use |
|-------|-----------|-------------|
| Primary (#c5c0ff) | `text-primary`, `bg-primary` | Actions, headings, active states |
| Secondary (#7bd0ff) | `text-secondary`, `bg-secondary` | Data vis, secondary info |
| Tertiary (#ffb785) | `text-tertiary`, `bg-tertiary` | Accents, atmospheric data |
| Success (#00D084) | `text-success-green`, `bg-success-green` | Online, healthy, completed |
| Warning (#FFB020) | `text-warning-gold`, `bg-warning-gold` | Caution, jitter, rerouted |
| Danger (#F04438) | `text-danger-red`, `bg-danger-red` | Errors, offline, failures |

### Spacing
- Page padding: `p-widget-padding` (24px)
- Gap between cards: `gap-gutter` (16px)
- Internal card padding: `p-widget-padding` (24px) or `p-compact-padding` (12px)
- Grid margin: `p-grid-margin` (32px)

### Card Pattern
```tsx
<div className="glass-card p-widget-padding hover-glow">
  <div className="flex items-center gap-2 mb-4">
    <span className="material-symbols-outlined text-primary">icon</span>
    <h3 className="text-label-caps text-on-surface-variant">SECTION TITLE</h3>
  </div>
  {/* Content */}
</div>
```

### Status Badge Pattern
```tsx
<span className={`text-label-caps px-2 py-0.5 rounded-sm ${
  status === 'delivered' ? 'bg-success-green/10 text-success-green border border-success-green/20'
  : status === 'undeliverable' ? 'bg-danger-red/10 text-danger-red border border-danger-red/20'
  : 'bg-warning-gold/10 text-warning-gold border border-warning-gold/20'
}`}>
  {status.toUpperCase()}
</span>
```

## Animation Guidelines

### Available Animations (from globals.css)
- `animate-node-pulse` — Pulsing glow for active nodes
- `animate-link-dash` — Dashed line flow for connections
- `animate-laser-line` — Laser beam pulsing effect
- `animate-scanning-line` — Vertical scanning sweep
- `animate-pulse` — Standard Tailwind pulse

### Rules
- Use CSS animations for continuous effects (node pulse, scanning lines)
- Use `requestAnimationFrame` for one-shot animations (packet movement)
- Keep animations subtle — they enhance, not distract
- Always provide `prefers-reduced-motion` consideration in production

## SVG Visualization Rules

- Normalize planet coordinates to SVG viewport: `pad + ((coord - min) / range) * (width - 2*pad)`
- Planet node sizes: proportional to `radius_km` (clamped 8-16px)
- Connection lines: dashed, low opacity, primary color
- Active elements: glow filters via SVG `<filter>` with `feGaussianBlur`
- Always use `viewBox` for responsive scaling

## API Integration Rules

- All API calls go through `src/lib/api.ts`
- Field names in request bodies must use `snake_case` (matching backend)
- Response types must match backend exactly — verify with `curl` when adding new endpoints
- Handle 3 states: loading, error, success on every data-fetching page
- Never trust backend data shape at runtime — use optional chaining (`?.`) for nested access

## Type Safety Rules

- Types in `src/types/index.ts` are the single source of truth for frontend
- When backend response shape changes, update types FIRST, then fix all usages
- No `@ts-ignore` or `@ts-expect-error`
- Prefer `interface` over `type` for object shapes
- Use discriminated unions for status fields: `'pending' | 'in_transit' | 'delivered' | 'undeliverable'`

## Testing Checklist (per page)

- [ ] Page renders without console errors
- [ ] Loading state shows while data fetches
- [ ] Error state shows when backend is down
- [ ] All interactive elements respond to clicks
- [ ] API calls use correct field names
- [ ] No TypeScript errors (`npx tsc --noEmit`)
