# Relic Ring Protocol

> A routing protocol simulation for the Zeta-26 star system — reconnecting planets through legacy infrastructure.

## Background

For centuries, the Zeta-26 star system flourished under the Aether-Net, a quantum entanglement network. The Hyper-Flare of 3704 shattered this network, leaving billions isolated. The **Relic Ring** — a crude infrastructure of underground fiber cables and laser transceivers — is humanity's last hope.

This system implements a ruthlessly efficient routing protocol that accounts for physical propagation delays, handles disparate planetary data dialects, and maintains resilience in the face of hardware failure.

## Features

- **Physical Latency Simulation** — Fiber transit, tower processing, atmospheric refraction, and void transmission delays
- **Codex Translation** — Real-time base conversion between planetary dialects (Base 5, 7, 8, 9, 12, 14, 16)
- **Shortest-Path Routing** — Dijkstra's algorithm for lowest-latency routes with Lmax enforcement
- **Dynamic Rerouting** — Chaos testing with node/link failures and automatic path recalculation
- **Interactive Visualization** — Full packet journey tracking with per-hop latency breakdowns

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd relic-ring

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### Running

```bash
# Terminal 1: Start the backend
cd backend
npm run dev
# Server runs on http://localhost:3001

# Terminal 2: Start the frontend
cd frontend
npm run dev
# App runs on http://localhost:3000
```

## Project Structure

```
relic-ring/
├── frontend/               # Next.js 15 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/            # App Router pages
│   │   │   ├── dashboard/  # Universe map & node visualization
│   │   │   ├── simulator/  # Packet transmission configuration
│   │   │   ├── journey/    # Real-time packet lifecycle viewer
│   │   │   ├── analytics/  # Latency breakdown dashboard
│   │   │   ├── codex/      # Base conversion step-by-step viewer
│   │   │   └── network/    # Chaos testing & network control
│   │   ├── components/     # Reusable UI components
│   │   ├── lib/            # API client & utilities
│   │   ├── hooks/          # Custom React hooks
│   │   └── types/          # TypeScript type definitions
│   └── public/             # Static assets
│
├── backend/                # Express.js + TypeScript
│   └── src/
│       ├── routes/         # API route handlers
│       ├── services/       # Business logic layer
│       ├── models/         # Data models
│       ├── utils/          # Helper utilities
│       └── middleware/     # Express middleware
│
├── shared/                 # Shared TypeScript modules
│   ├── types/              # Shared type definitions
│   ├── constants/          # Physical constants & defaults
│   └── protocol/           # Core protocol logic
│       ├── codex.ts        # Base conversion & encoding
│       ├── latency.ts      # Physics-based latency calculations
│       └── routing.ts      # Dijkstra routing & graph building
│
├── universe/               # Simulation configuration
│   └── universe-config.json
│
├── docs/                   # Project specification documents
└── assets/                 # Static assets & media
```

## Configuration

The simulation is driven entirely by `universe/universe-config.json`. No planetary values are hardcoded.

### Universe Metadata
| Parameter | Default | Description |
|-----------|---------|-------------|
| `speed_of_light_kms` | 300,000 | Speed of light in km/s |
| `fiber_speed_fraction` | 0.67 | Fiber propagation as fraction of c |
| `tower_processing_delay_ms` | 7 | Processing delay per tower hit |
| `max_hop_distance_km` | 50,000,000 | Maximum single void hop distance |
| `coordinate_scale_unit_km` | 100,000 | Grid-to-km conversion factor |

### Planet Node Schema
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique planet identifier |
| `codex` | integer | Numerical base for data receiving |
| `x` / `y` | number | Universe grid coordinates |
| `radius_km` | number | Physical radius in km |
| `active_towers` | integer | Routing towers (≥ 4) |
| `atmosphere_thickness_km` | number | Atmospheric shell height |
| `refraction_index` | number | Atmospheric density coefficient |

## Latency Model

Total end-to-end latency is composed of:

1. **Fiber Transit (Tp)** — Data travels along the planet's equatorial fiber ring at `f × c`
2. **Tower Processing** — Every tower hit incurs a fixed `Δt` ms penalty
3. **Atmospheric Refraction** — Signals passing through the ionized atmosphere are slowed by the refraction index
4. **Void Transmission (Tv)** — Laser transmission across vacuum between planets

```
Total Latency = Σ Tp(Pi) + Σ Tv(Pi, Pi+1)
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/universe` | Full universe configuration |
| `GET` | `/api/universe/planets` | All planet nodes |
| `GET` | `/api/universe/planets/:id` | Single planet details |
| `POST` | `/api/packets/send` | Transmit a packet |
| `GET` | `/api/packets/history` | Transmission history |
| `GET` | `/api/routing/route` | Calculate optimal route |
| `POST` | `/api/codex/translate` | Codex base translation |
| `GET` | `/api/network/status` | Network health state |
| `POST` | `/api/network/disable-node` | Simulate node failure |
| `POST` | `/api/network/enable-node` | Restore a node |

## Technology Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Zustand, React Query
- **Backend**: Express.js, TypeScript
- **Design**: Glassmorphic-Industrial theme (Space Grotesk, Inter, JetBrains Mono)
- **Protocol**: Custom Dijkstra routing, base-N codex conversion, physics-based latency model

## Team

Built for **Launch 26** — IEEE Computer Society Chapter, University of Kelaniya.

## License

MIT
