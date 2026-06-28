# Relic Ring Protocol — CLAUDE.md

## Project Overview

The Relic Ring Protocol is a routing protocol simulation for the Zeta-26 star system. It simulates inter-planetary communication across a network of planets connected by legacy fiber cables and laser transceivers, accounting for physical propagation delays, disparate planetary data dialects (codex bases), and network resilience under failure.

**Competition**: Launch 26 — IEEE Computer Society Chapter, University of Kelaniya.

## Architecture

```
relic-ring/
├── frontend/          # Next.js 15 + TypeScript + Tailwind CSS v4
│   ├── src/app/       # App Router pages (dashboard, simulator, journey, analytics, codex, network)
│   ├── src/components/# Reusable UI components (layout/, shared/)
│   ├── src/lib/       # API client, utilities
│   ├── src/hooks/     # Custom React hooks (Zustand stores)
│   └── src/types/     # Frontend TypeScript types
├── backend/           # Express.js + TypeScript API server
│   └── src/
│       ├── routes/    # REST endpoints (universe, packets, routing, codex, network)
│       └── services/  # Business logic (universe, routing, packet, codex)
├── shared/            # Pure TypeScript protocol logic
│   ├── types/         # Shared interfaces (universe, packet, routing)
│   ├── constants/     # Physical constants and defaults
│   └── protocol/      # Core algorithms (codex.ts, latency.ts, routing.ts)
├── universe/          # universe-config.json (simulation data source)
├── docs/              # Competition spec PDFs
└── assets/            # Static media
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 15 (App Router) | SPA with file-based routing |
| Styling | Tailwind CSS v4 | Utility-first, `@theme` block for design tokens |
| State | Zustand | Lightweight global state |
| Data | React Query (planned) | Server state management |
| Backend | Express.js 5 + TypeScript | REST API server |
| Dev Runner | tsx | Fast TypeScript execution |
| Fonts | Space Grotesk, Inter, JetBrains Mono | Design system typography |
| Icons | Material Symbols Outlined | Google Fonts icon set |

## Running the Project

```bash
# Terminal 1: Backend (port 3001)
cd relic-ring/backend && npm run dev

# Terminal 2: Frontend (port 3000)
cd relic-ring/frontend && npm run dev
```

## Coding Standards

### General
- TypeScript strict mode everywhere — no `any` types
- No hardcoded planetary values — everything from `universe-config.json`
- Physical constants from `universe_metadata`, with defaults in `shared/constants/`
- Prefer explicit return types on exported functions
- No unused variables or imports

### Backend
- Services are singletons (module-level instances)
- Routes are thin — delegate to services
- All API responses are JSON; errors include `{ error: string }` with appropriate HTTP status
- Paths: `POST /api/packets/send` expects `{ origin_id, destination_id, payload }`
- Paths: `POST /api/network/disable-node` expects `{ planet_id }`

### Frontend
- All interactive pages use `"use client"` directive
- API calls go through `src/lib/api.ts` — never call `fetch()` directly in components
- Types live in `src/types/index.ts` and must match backend response shapes exactly
- Design system classes: `.glass-panel`, `.glass-card`, `.hover-glow`, `.text-label-caps`, `.text-data-mono`, `.text-headline-lg`, etc.
- Loading/error states are required on every page that fetches data

### Naming Conventions
- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- Variables: `camelCase`
- Types/Interfaces: `PascalCase`
- API fields: `snake_case` (matches backend)
- CSS classes: Tailwind utilities + design system classes

## Key Domain Concepts

### Universe Config (`universe/universe-config.json`)
- `universe_metadata`: physical constants (speed of light, fiber fraction, tower delay, Lmax, coordinate scale)
- `planets[]`: nodes with id, codex, x, y, radius_km, active_towers, atmosphere_thickness_km, refraction_index
- Coordinates are abstract grid units — multiply by `coordinate_scale_unit_km` for km
- `radius_km` is already in km — do NOT scale it

### Physics Formulas
```
Void Distance:    L = sqrt((x2-x1)² + (y2-y1)²) × S - (R1+h1) - (R2+h2)
Void Travel Time: Tv = ((h1×n1) + (h2×n2) + L) / C    [seconds → multiply by 1000 for ms]
Fiber Transit:    Tp = (2πr×s)/(N×f×C) + m×Δt          [m = s+1, or 1 if s=0]
Total Latency:    Σ Tp(Pi) + Σ Tv(Pi, Pi+1)
```

### Codex Translation
- Each planet has a unique numerical base (codex) for receiving data
- Flow: ASCII → Next Hop Codex → Binary Stream → Void → Destination Codex → ASCII
- Internal tower-to-tower transit uses ASCII encoding

### Routing (Dijkstra)
- Weighted graph where edges exist only if void distance ≤ Lmax (50M km default)
- Weight = void travel time between planets
- Dynamic rerouting when nodes/links are disabled (chaos testing)

### Tower Geometry
- Towers placed at equal angular intervals clockwise from top (positive y-axis)
- Tower 0 at 12 o'clock position
- Line-of-sight: tower pair minimizing straight-line void distance
- Processing delay: Δt ms per tower hit (entry + exit, deduped if same tower)

## API Reference

| Method | Endpoint | Body | Returns |
|--------|----------|------|---------|
| GET | `/api/health` | — | `{ status, timestamp }` |
| GET | `/api/universe` | — | `UniverseConfig` |
| GET | `/api/universe/metadata` | — | `UniverseMetadata` |
| GET | `/api/universe/planets` | — | `PlanetNode[]` |
| GET | `/api/universe/planets/:id` | — | `PlanetNode` |
| POST | `/api/packets/send` | `{ origin_id, destination_id, payload }` | `Packet` |
| GET | `/api/packets/history` | — | `Packet[]` |
| GET | `/api/routing/route?from=X&to=Y` | — | `Route` |
| GET | `/api/routing/reachable?from=X` | — | `{ from, reachable[] }` |
| POST | `/api/codex/translate` | `{ text, target_base }` | `TranslationResult` |
| GET | `/api/codex/bases` | — | `{ id, codex }[]` |
| GET | `/api/network/status` | — | `NetworkState` |
| POST | `/api/network/disable-node` | `{ planet_id }` | `{ success, state }` |
| POST | `/api/network/enable-node` | `{ planet_id }` | `{ success, state }` |
| POST | `/api/network/disable-link` | `{ from, to }` | `{ success, state }` |
| POST | `/api/network/enable-link` | `{ from, to }` | `{ success, state }` |

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0f1321` | Page background |
| Surface Card | `#0B1020` | Card backgrounds |
| Primary | `#c5c0ff` | Actions, highlights, headings |
| Secondary | `#7bd0ff` | Data visualization, secondary actions |
| Tertiary | `#ffb785` | Accents, warnings |
| Success | `#00D084` | Online, healthy, completed |
| Warning | `#FFB020` | Jitter, caution states |
| Danger | `#F04438` | Errors, offline, failures |
| Glass Panel | `rgba(15,19,33,0.4)` + `backdrop-blur(40px)` + `1px white/10 border` | All floating panels |

## Important Constraints

- No hardcoded planetary values — parse from universe-config.json
- Universe-level constants must come from config, not code
- The universe is static (no orbital mechanics)
- Atmospheric transit distance = straight-through simplification (h, not slant path)
- Void distance = center-to-center minus (radius+atmosphere), tower positions don't alter L
- Tower pair selection determines which tower sends/receives, but does not change L or h
