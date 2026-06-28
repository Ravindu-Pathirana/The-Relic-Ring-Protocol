# Frontend Roadmap — Relic Ring Protocol

A detailed implementation plan broken into ~90 small tasks. Each task is designed to be completable in a single Claude session without large, error-prone generations.

## Phase 1 — Foundation (Tasks 1–10)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 1 | Install Framer Motion for page transitions and micro-animations | `package.json` | `npm install framer-motion` |
| 2 | Install Recharts for chart components | `package.json` | `npm install recharts` |
| 3 | Install React Flow for the universe graph visualization | `package.json` | `npm install @xyflow/react` |
| 4 | Set up Zustand stores: `useUniverseStore`, `usePacketStore`, `useNetworkStore` | `src/hooks/` | Split from single `useUniverse.ts` into domain stores |
| 5 | Add page transition wrapper using Framer Motion `AnimatePresence` | `src/app/layout.tsx` | Fade-in/out between routes |
| 6 | Add WebGL starfield shader background component | `src/components/shared/StarfieldBg.tsx` | Port from Stitch design HTML |
| 7 | Refine Sidebar with hover expand/collapse animation | `src/components/layout/Sidebar.tsx` | Match Stitch universe_configuration design variant |
| 8 | Add notification bell with badge counter to TopNav | `src/components/layout/TopNav.tsx` | Red dot for alerts |
| 9 | Add command palette (Cmd+K) with search across planets and routes | `src/components/shared/CommandPalette.tsx` | Dialog overlay |
| 10 | Add responsive breakpoint handling — collapse sidebar on mobile | `src/components/layout/Sidebar.tsx` | hamburger menu on < 768px |

## Phase 2 — Shared Components (Tasks 11–25)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 11 | Create `GlassCard` component with hover-glow and optional border accent | `src/components/shared/GlassCard.tsx` | Replace raw `glass-card` divs |
| 12 | Create `MetricCard` with icon, label, value, trend indicator, progress bar | `src/components/shared/MetricCard.tsx` | Used in dashboard sidebar + analytics KPIs |
| 13 | Create `PlanetCard` showing planet details (codex, towers, radius, atmos) | `src/components/shared/PlanetCard.tsx` | Slide-out panel content |
| 14 | Create `StatusBadge` component (delivered/undeliverable/in_transit/rerouted) | `src/components/shared/StatusBadge.tsx` | Color-coded pill |
| 15 | Create `Tooltip` component with glassmorphic styling | `src/components/shared/Tooltip.tsx` | Hover info on chart points / nodes |
| 16 | Create `Timeline` component for horizontal hop visualization | `src/components/shared/Timeline.tsx` | Reusable across simulator + journey |
| 17 | Create `SearchInput` component with icon + focus glow | `src/components/shared/SearchInput.tsx` | Used in TopNav and filter sidebars |
| 18 | Create `Dialog` / `Modal` component with glass overlay | `src/components/shared/Dialog.tsx` | For confirmations + node selection |
| 19 | Create `Drawer` slide-out panel component | `src/components/shared/Drawer.tsx` | Planet details, packet details |
| 20 | Create `LoadingSkeleton` component matching glass-card shapes | `src/components/shared/LoadingSkeleton.tsx` | Pulsing placeholder cards |
| 21 | Create `Toast` notification system | `src/components/shared/Toast.tsx` | Success/error/info toasts |
| 22 | Create `DataTable` component with sorting, pagination, row selection | `src/components/shared/DataTable.tsx` | Reusable for journey + analytics tables |
| 23 | Create `ProgressBar` component with glow effect | `src/components/shared/ProgressBar.tsx` | Colored, animated fill |
| 24 | Create `Toggle` switch component | `src/components/shared/Toggle.tsx` | Auto-recovery toggle in chaos engine |
| 25 | Create `Select` dropdown with glassmorphic styling | `src/components/shared/Select.tsx` | Replace raw `<select>` elements |

## Phase 3 — Universe Dashboard (Tasks 26–35)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 26 | Replace SVG map with React Flow canvas for zoom/pan | `src/app/dashboard/page.tsx`, `src/components/universe/` | Interactive graph |
| 27 | Create `PlanetNode` custom React Flow node with glow + label | `src/components/universe/PlanetNode.tsx` | Sized by radius, colored by status |
| 28 | Create `ConnectionEdge` custom React Flow edge with animated dash | `src/components/universe/ConnectionEdge.tsx` | Color by latency range |
| 29 | Add planet click handler to open Drawer with full planet details | `src/components/universe/PlanetDetail.tsx` | Slide-out from right |
| 30 | Add latency labels on edges (show on hover) | `src/components/universe/ConnectionEdge.tsx` | Tooltip or inline label |
| 31 | Add universe map legend (node colors, edge types) | `src/components/universe/MapLegend.tsx` | Bottom-left overlay |
| 32 | Add search filter for planets on the map | `src/app/dashboard/page.tsx` | Highlight matching nodes |
| 33 | Add zoom controls (zoom in, zoom out, fit view) | `src/app/dashboard/page.tsx` | React Flow controls |
| 34 | Move stats sidebar cards to use `MetricCard` component | `src/app/dashboard/page.tsx` | Total planets, online, latency, health |
| 35 | Add real-time health percentage calculation from network state | `src/app/dashboard/page.tsx` | `(active/total) * 100` |

## Phase 4 — Packet Simulator (Tasks 36–45)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 36 | Extract packet form into `PacketForm` component | `src/components/packet/PacketForm.tsx` | Source, dest, payload, priority |
| 37 | Add form validation — prevent same origin/destination, empty payload | `src/components/packet/PacketForm.tsx` | Inline error messages |
| 38 | Create animated packet dot using Framer Motion path animation | `src/components/packet/PacketAnimation.tsx` | Follow SVG path from origin to dest |
| 39 | Add intermediate relay nodes on the transmission map for multi-hop | `src/app/simulator/page.tsx` | Show all hops, not just origin/dest |
| 40 | Add per-hop latency breakdown tooltip on hover over timeline nodes | `src/app/simulator/page.tsx` | Fiber + tower + void + atmos |
| 41 | Add codex payload preview in the packet details panel | `src/app/simulator/page.tsx` | Show `payload_in_codex` for each hop |
| 42 | Add simulation speed control (0.5x, 1x, 2x, 4x) | `src/app/simulator/page.tsx` | Affects animation duration |
| 43 | Add packet send history list (last 5 packets sent from this session) | `src/app/simulator/page.tsx` | Quick re-send capability |
| 44 | Add sound effect toggle for packet transmission events | `src/app/simulator/page.tsx` | Optional audio cue |
| 45 | Add export packet result as JSON | `src/app/simulator/page.tsx` | Download button |

## Phase 5 — Journey Visualization (Tasks 46–55)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 46 | Create tower ring visualization for each planet in hop detail | `src/components/packet/TowerRing.tsx` | SVG circle with tower markers |
| 47 | Add fiber path animation (arc between towers on a planet) | `src/components/packet/FiberPath.tsx` | Curved line on tower ring |
| 48 | Add laser path animation (straight line between planets in void) | `src/components/packet/LaserPath.tsx` | Glowing beam effect |
| 49 | Create full-screen journey playback view | `src/app/journey/page.tsx` | Step through hops with play/pause |
| 50 | Add playback controls: play, pause, step forward, step back, speed | `src/components/packet/PlaybackControls.tsx` | Matches Stitch design |
| 51 | Show atmospheric refraction layer around planets during void transit | `src/components/packet/AtmosphereLayer.tsx` | Semi-transparent ring |
| 52 | Add real-time latency ticker during playback | `src/app/journey/page.tsx` | Accumulates as packet progresses |
| 53 | Add per-hop detail cards that appear as packet reaches each planet | `src/app/journey/page.tsx` | Floating glass cards |
| 54 | Improve hop breakdown panel with tower entry/exit visualization | `src/app/journey/page.tsx` | Show which tower received/sent |
| 55 | Add keyboard shortcuts for playback (space=play/pause, arrows=step) | `src/app/journey/page.tsx` | `useEffect` keydown listener |

## Phase 6 — Analytics (Tasks 56–65)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 56 | Replace static SVG charts with Recharts `AreaChart` for latency trend | `src/app/analytics/page.tsx` | Real data from packet history |
| 57 | Replace static donut with Recharts `PieChart` for latency breakdown | `src/app/analytics/page.tsx` | Void/fiber/tower/atmosphere segments |
| 58 | Add Recharts `BarChart` for hop comparison by planet | `src/app/analytics/page.tsx` | Horizontal bars |
| 59 | Add date/time range filter for analytics data | `src/app/analytics/page.tsx` | Filter packet history by timestamp |
| 60 | Add planet filter dropdown for analytics | `src/app/analytics/page.tsx` | Show stats for specific planet only |
| 61 | Add export analytics as CSV | `src/app/analytics/page.tsx` | Download button on telemetry table |
| 62 | Calculate real KPI values from packet history (not hardcoded) | `src/app/analytics/page.tsx` | Avg latency, fiber/tower/void breakdown |
| 63 | Add tooltip on chart hover showing exact values | `src/app/analytics/page.tsx` | Recharts custom tooltip |
| 64 | Add responsive chart sizing | `src/app/analytics/page.tsx` | `ResponsiveContainer` wrapper |
| 65 | Add latency anomaly detection — highlight packets > 2x avg | `src/app/analytics/page.tsx` | Red highlight on outlier rows |

## Phase 7 — Codex Viewer (Tasks 66–75)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 66 | Create `AsciiViewer` component showing char grid with values | `src/components/codex/AsciiViewer.tsx` | Grid of char + decimal + hex |
| 67 | Add interactive base selector showing all planet codex bases | `src/app/codex/page.tsx` | Visual planet icons as selectors |
| 68 | Create step-by-step division animation using Framer Motion | `src/components/codex/DivisionAnimation.tsx` | Animate each division step |
| 69 | Add multi-hop translation view (A → B → C codex flow) | `src/app/codex/page.tsx` | Show full transmission path |
| 70 | Improve binary stream with typewriter effect and hex addresses | `src/app/codex/page.tsx` | Green-on-black terminal style |
| 71 | Add copy-to-clipboard for each representation (ASCII, hex, binary, codex) | `src/app/codex/page.tsx` | Click-to-copy with toast feedback |
| 72 | Add download payload as binary file | `src/app/codex/page.tsx` | Blob download |
| 73 | Add character highlight — clicking a char in the table highlights it everywhere | `src/app/codex/page.tsx` | Sync across all 3 panels |
| 74 | Add comparison view — show same message in 2 different bases side by side | `src/app/codex/page.tsx` | Split panel comparison |
| 75 | Add input validation — warn on non-ASCII characters | `src/app/codex/page.tsx` | Inline warning badge |

## Phase 8 — Chaos Testing (Tasks 76–87)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 76 | Add "Solar Storm" chaos action — disable random 2 links for 30s | `src/app/network/page.tsx` | Temporary disruption |
| 77 | Add "Fiber Cut" chaos action — disable a specific link via dialog | `src/app/network/page.tsx` | Uses `disableLink` API |
| 78 | Add "Distortion" chaos action — visual interference effect on map | `src/app/network/page.tsx` | CSS glitch animation |
| 79 | Add auto-rerouting demonstration — send packet, disable node, send again | `src/app/network/page.tsx` | Show old vs new route |
| 80 | Add node failure cascade visualization — show affected routes | `src/app/network/page.tsx` | Highlight all routes through disabled node |
| 81 | Add link failure visualization on the SVG graph (red dashed line) | `src/app/network/page.tsx` | Already partially done — polish |
| 82 | Add network health percentage calculation in real-time | `src/app/network/page.tsx` | `(activeNodes / totalNodes) * 100` |
| 83 | Add event log persistence (localStorage) across page reloads | `src/app/network/page.tsx` | Zustand persist middleware |
| 84 | Add event log export as text file | `src/app/network/page.tsx` | Download button |
| 85 | Add node detail panel on click (show towers, codex, connections) | `src/app/network/page.tsx` | Drawer or panel within graph area |
| 86 | Add "Restore All" button to re-enable all disabled nodes/links at once | `src/app/network/page.tsx` | Batch API calls |
| 87 | Add confirmation dialog before destructive chaos actions | `src/app/network/page.tsx` | "Are you sure?" modal |

## Phase 9 — Polish & Production (Tasks 88–95)

| # | Task | File(s) | Notes |
|---|------|---------|-------|
| 88 | Add global error boundary component | `src/components/shared/ErrorBoundary.tsx` | Catch React render errors |
| 89 | Add favicon and Open Graph meta tags | `src/app/layout.tsx`, `public/` | Relic Ring branding |
| 90 | Add loading page (skeleton layout while initial data loads) | `src/app/loading.tsx` | Next.js loading convention |
| 91 | Add keyboard navigation across all interactive elements | All pages | Focus management, tab order |
| 92 | Performance audit — React.memo for expensive components | All components | Profile with React DevTools |
| 93 | Add `prefers-reduced-motion` respect for all animations | `globals.css` | Media query |
| 94 | Add environment variable validation on startup | `src/lib/api.ts` | Warn if API_URL is missing |
| 95 | Final visual QA pass — compare each page against Stitch design screenshots | All pages | Pixel-level adjustments |

## Execution Notes

- **One task per session**: Each task is small enough to complete in a single Claude interaction
- **Test after each task**: Run `npx tsc --noEmit` after every change
- **Commit often**: One commit per task with descriptive message
- **Build before pushing**: `npx next build` to verify no build errors
- **Backend must be running**: Start backend before testing any frontend page
- **Check Stitch designs**: HTML files in `Stitch design/` are the visual reference — open in browser to compare
