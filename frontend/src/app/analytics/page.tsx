'use client';

import { useEffect, useState, useMemo } from 'react';
import { fetchPacketHistory } from '@/lib/api';
import type { Packet, HopLogEntry, PacketStatus } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function shortId(id: string) {
  return id.length > 10 ? id.slice(0, 4) + '..' + id.slice(-4) : id;
}


// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-body-md text-on-surface-variant">Loading telemetry data...</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <span className="material-symbols-outlined text-danger-red" style={{ fontSize: 48 }}>error</span>
      <p className="text-body-md text-danger-red">{message}</p>
      <p className="text-body-sm text-on-surface-variant">Displaying fallback data.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI Card
// ---------------------------------------------------------------------------

interface KpiProps {
  label: string;
  value: number;
  unit: string;
  accent: string;       // tailwind color token e.g. "primary"
  barPct: number;       // 0-100
  icon: string;
}

function KpiCard({ label, value, unit, accent, barPct, icon }: KpiProps) {
  const accentColor = `var(--color-${accent})`;
  return (
    <div className="glass-card hover-glow p-widget-padding group cursor-default transition-all relative overflow-hidden">
      {/* Expanding circle hover effect */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 transition-all duration-500 opacity-10 group-hover:scale-150 group-hover:opacity-20"
        style={{ backgroundColor: accentColor }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-label-caps text-on-surface-variant">{label}</span>
          <span
            className="material-symbols-outlined text-on-surface-variant group-hover:scale-110 transition-transform"
            style={{ color: accentColor, fontSize: 20 }}
          >
            {icon}
          </span>
        </div>
        <p className="text-headline-lg mb-3" style={{ color: accentColor }}>
          {value.toFixed(1)}
          <span className="text-body-sm text-on-surface-variant ml-1">{unit}</span>
        </p>
        {/* progress bar */}
        <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${clamp(barPct, 2, 100)}%`, backgroundColor: accentColor }}
          />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG Area Chart — Latency Trend
// ---------------------------------------------------------------------------

function LatencyTrendChart({ data }: { data: number[] }) {
  const W = 720;
  const H = 300;
  const PAD_L = 50;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 40;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const range = maxVal - minVal || 1;

  const points = data.map((v, i) => ({
    x: PAD_L + (i / Math.max(data.length - 1, 1)) * plotW,
    y: PAD_T + plotH - ((v - minVal) / range) * plotH,
    v,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1]?.x ?? PAD_L},${PAD_T + plotH} L${PAD_L},${PAD_T + plotH} Z`;

  // Y-axis ticks (5)
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minVal + (range * i) / 4;
    const y = PAD_T + plotH - (i / 4) * plotH;
    return { val, y };
  });

  // X-axis labels (up to 8)
  const step = Math.max(1, Math.floor(data.length / 8));
  const xLabels = points.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* grid lines */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={PAD_L} y1={t.y} x2={W - PAD_R} y2={t.y} stroke="var(--color-outline-variant)" strokeOpacity={0.25} strokeDasharray="4 4" />
          <text x={PAD_L - 8} y={t.y + 4} textAnchor="end" fill="var(--color-on-surface-variant)" fontSize={10} fontFamily="var(--font-mono)">
            {t.val.toFixed(0)}
          </text>
        </g>
      ))}

      {/* area fill */}
      {points.length > 1 && <path d={areaPath} fill="url(#areaGrad)" />}

      {/* line */}
      {points.length > 1 && (
        <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} fill="var(--color-surface)" stroke="var(--color-primary)" strokeWidth={2} />
          <title>{p.v.toFixed(1)} ms</title>
        </g>
      ))}

      {/* X-axis labels */}
      {xLabels.map((p, i) => {
        const idx = points.indexOf(p);
        return (
          <text key={i} x={p.x} y={H - 8} textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize={10} fontFamily="var(--font-mono)">
            P{idx + 1}
          </text>
        );
      })}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// SVG Donut Chart — Latency Breakdown
// ---------------------------------------------------------------------------

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ segments, total }: { segments: DonutSegment[]; total: number }) {
  const R = 80;
  const STROKE = 24;
  const C = 2 * Math.PI * R;
  const sum = segments.reduce((a, s) => a + s.value, 0) || 1;

  const arcs = segments.reduce<
    Array<DonutSegment & { dashLen: number; dashOffset: number; pct: number }>
  >((acc, s) => {
    const pct = s.value / sum;
    const dashLen = pct * C;
    const prevOffset = acc.length > 0 ? acc[acc.length - 1].dashLen + Math.abs(acc[acc.length - 1].dashOffset) : 0;
    acc.push({ ...s, dashLen, dashOffset: -prevOffset, pct });
    return acc;
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      <svg viewBox="0 0 200 200" className="w-48 h-48">
        {arcs.map((a, i) => (
          <circle
            key={i}
            cx={100} cy={100} r={R}
            fill="none"
            stroke={a.color}
            strokeWidth={STROKE}
            strokeDasharray={`${a.dashLen} ${C - a.dashLen}`}
            strokeDashoffset={a.dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            opacity={0.85}
          >
            <title>{a.label}: {a.value.toFixed(1)} ms ({(a.pct * 100).toFixed(0)}%)</title>
          </circle>
        ))}
        <text x={100} y={92} textAnchor="middle" fill="var(--color-on-surface)" fontSize={26} fontFamily="var(--font-display)" fontWeight={700}>
          {total.toFixed(0)}
        </text>
        <text x={100} y={112} textAnchor="middle" fill="var(--color-on-surface-variant)" fontSize={10} fontFamily="var(--font-mono)" letterSpacing="0.1em" fontWeight={700}>
          TOTAL MS
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-col gap-2 w-full px-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-body-sm text-on-surface-variant">{s.label}</span>
            </div>
            <span className="text-data-mono text-on-surface">{s.value.toFixed(1)} ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal Bar Chart — Hop Comparison
// ---------------------------------------------------------------------------

interface HopBarData {
  planet: string;
  avgDelay: number;
}

function HopComparisonChart({ data }: { data: HopBarData[] }) {
  const maxDelay = Math.max(...data.map((d) => d.avgDelay), 1);

  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => {
        const pct = (d.avgDelay / maxDelay) * 100;
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-data-mono text-on-surface-variant w-24 truncate text-right" title={d.planet}>
              {shortId(d.planet)}
            </span>
            <div className="flex-1 h-5 rounded bg-surface-container-high overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${clamp(pct, 2, 100)}%`,
                  background: `linear-gradient(90deg, var(--color-secondary), var(--color-primary))`,
                }}
              />
            </div>
            <span className="text-data-mono text-on-surface w-16 text-right">{d.avgDelay.toFixed(1)}</span>
          </div>
        );
      })}
      {data.length === 0 && (
        <p className="text-body-sm text-on-surface-variant text-center py-4">No hop data available.</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Telemetry Table
// ---------------------------------------------------------------------------

/** Map packet status to a quality label used in the telemetry table. */
function qualityLabel(status: PacketStatus): { label: string; bg: string; text: string } {
  switch (status) {
    case 'delivered':
      return { label: 'OPTIMAL', bg: 'bg-success-green/20', text: 'text-success-green' };
    case 'in_transit':
      return { label: 'JITTER', bg: 'bg-warning-gold/20', text: 'text-warning-gold' };
    case 'pending':
      return { label: 'JITTER', bg: 'bg-warning-gold/20', text: 'text-warning-gold' };
    case 'undeliverable':
      return { label: 'CRITICAL', bg: 'bg-danger-red/20', text: 'text-danger-red' };
  }
}

/** Compute signal strength (0-4 bars) from latency. Lower latency = more bars. */
function signalBars(latencyMs: number): number {
  if (latencyMs <= 50) return 4;
  if (latencyMs <= 120) return 3;
  if (latencyMs <= 250) return 2;
  if (latencyMs <= 500) return 1;
  return 0;
}

function SignalStrength({ bars }: { bars: number }) {
  const barColors = [
    'bg-danger-red',
    'bg-warning-gold',
    'bg-warning-gold',
    'bg-success-green',
  ];
  return (
    <div className="flex items-end gap-0.5 h-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-1 rounded-sm transition-colors ${i < bars ? barColors[bars - 1] : 'bg-outline-variant/30'}`}
          style={{ height: `${6 + i * 3}px` }}
        />
      ))}
    </div>
  );
}

function TelemetryTable({ packets }: { packets: Packet[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-outline-variant/30">
            {['PACKET ID', 'PATH', 'HOPS', 'SIGNAL', 'LATENCY', 'STATUS'].map((h) => (
              <th key={h} className="text-label-caps text-on-surface-variant pb-3 pr-4 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {packets.map((pkt, i) => {
            const path = `${pkt.origin_id} -> ${pkt.destination_id}`;
            const quality = qualityLabel(pkt.status);
            const bars = signalBars(pkt.total_latency_ms);
            return (
              <tr key={i} className="border-b border-outline-variant/10 hover:bg-surface-container/40 transition-colors">
                <td className="text-data-mono text-on-surface py-3 pr-4">
                  {shortId(pkt.origin_id)}-{shortId(pkt.destination_id)}
                </td>
                <td className="text-body-sm text-on-surface-variant py-3 pr-4 max-w-[180px] truncate" title={path}>
                  {shortId(pkt.origin_id)} <span className="text-primary">-&gt;</span> {shortId(pkt.destination_id)}
                </td>
                <td className="text-data-mono text-on-surface py-3 pr-4">{pkt.hop_log.length}</td>
                <td className="py-3 pr-4">
                  <SignalStrength bars={bars} />
                </td>
                <td className="text-data-mono text-primary py-3 pr-4">{pkt.total_latency_ms.toFixed(1)} ms</td>
                <td className="py-3">
                  <span className={`inline-block text-label-caps px-2.5 py-1 rounded-full ${quality.bg} ${quality.text}`}>
                    {quality.label}
                  </span>
                </td>
              </tr>
            );
          })}
          {packets.length === 0 && (
            <tr>
              <td colSpan={6} className="text-body-sm text-on-surface-variant text-center py-8">No packets recorded yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function AnalyticsPage() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchPacketHistory()
      .then((data) => {
        if (!cancelled) setPackets(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load packet data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ---- Derived data ----
  const allHops = useMemo<HopLogEntry[]>(() => packets.flatMap((p) => p.hop_log), [packets]);

  const kpis = useMemo(() => {
    const totalAvg = packets.length > 0 ? avg(packets.map((p) => p.total_latency_ms)) : 0;
    const fiberAvg = allHops.length > 0 ? avg(allHops.map((h) => h.fiber_latency_ms)) : 0;
    const towerAvg = allHops.length > 0 ? avg(allHops.map((h) => h.tower_delay_ms)) : 0;
    const voidVals = allHops.map((h) => h.void_latency_ms).filter((v): v is number => v !== null);
    const voidAvg = voidVals.length > 0 ? avg(voidVals) : 0;
    const maxLatency = Math.max(totalAvg, 1);
    return { totalAvg, fiberAvg, towerAvg, voidAvg, maxLatency };
  }, [packets, allHops]);

  const trendData = useMemo(() => {
    const recent = packets.slice(-20);
    return recent.map((p) => p.total_latency_ms);
  }, [packets]);

  const donutSegments = useMemo<DonutSegment[]>(() => [
    { label: 'Void Transit', value: kpis.voidAvg, color: 'var(--color-danger-red)' },
    { label: 'Fiber Delay', value: kpis.fiberAvg, color: 'var(--color-secondary)' },
    { label: 'Tower Overhead', value: kpis.towerAvg, color: 'var(--color-tertiary)' },
  ], [kpis]);

  const hopBarData = useMemo<HopBarData[]>(() => {
    const map = new Map<string, number[]>();
    for (const hop of allHops) {
      const total = hop.fiber_latency_ms + hop.tower_delay_ms + (hop.void_latency_ms ?? 0);
      const arr = map.get(hop.planet_id) ?? [];
      arr.push(total);
      map.set(hop.planet_id, arr);
    }
    return Array.from(map.entries())
      .map(([planet, vals]) => ({ planet, avgDelay: avg(vals) }))
      .sort((a, b) => b.avgDelay - a.avgDelay);
  }, [allHops]);

  const tablePackets = useMemo(() => packets.slice(-10).reverse(), [packets]);

  // ---- Render ----

  if (loading) {
    return (
      <div className="p-widget-padding">
        <h1 className="text-headline-lg text-on-surface mb-2">Latency Analytics</h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          Detailed breakdown of latency components across void hops, fiber transit, and atmospheric delays.
        </p>
        <LoadingState />
      </div>
    );
  }

  if (error && packets.length === 0) {
    return (
      <div className="p-widget-padding">
        <h1 className="text-headline-lg text-on-surface mb-2">Latency Analytics</h1>
        <p className="text-body-md text-on-surface-variant mb-8">
          Detailed breakdown of latency components across void hops, fiber transit, and atmospheric delays.
        </p>
        <ErrorState message={error} />
      </div>
    );
  }

  const noData = packets.length === 0;

  return (
    <div className="p-widget-padding space-y-gutter">
      {/* Top Bar */}
      <div className="glass-card p-compact-padding flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>monitoring</span>
          <span className="text-label-caps text-on-surface-variant tracking-wider">PROTOCOL.LATENCY.TELEMETRY</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-success-green animate-pulse" />
          <span className="text-label-caps text-success-green text-[10px]">UPTIME</span>
        </div>
      </div>

      {/* Page Header */}
      <div>
        <h1 className="text-headline-lg text-on-surface mb-2">Latency Analytics</h1>
        <p className="text-body-md text-on-surface-variant">
          Detailed breakdown of latency components across void hops, fiber transit, and atmospheric delays.
        </p>
      </div>

      {noData && (
        <div className="glass-card p-compact-padding flex items-center gap-3">
          <span className="material-symbols-outlined text-warning-gold" style={{ fontSize: 20 }}>info</span>
          <p className="text-body-sm text-on-surface-variant">
            No packets have been sent yet. Send packets from the Simulator to populate analytics data.
          </p>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <KpiCard
          label="Total Avg Latency"
          value={kpis.totalAvg}
          unit="ms"
          accent="primary"
          barPct={(kpis.totalAvg / kpis.maxLatency) * 100}
          icon="speed"
        />
        <KpiCard
          label="Fiber Delay"
          value={kpis.fiberAvg}
          unit="ms"
          accent="secondary"
          barPct={kpis.maxLatency > 0 ? (kpis.fiberAvg / kpis.maxLatency) * 100 : 0}
          icon="settings_input_antenna"
        />
        <KpiCard
          label="Tower Overhead"
          value={kpis.towerAvg}
          unit="ms"
          accent="tertiary"
          barPct={kpis.maxLatency > 0 ? (kpis.towerAvg / kpis.maxLatency) * 100 : 0}
          icon="cell_tower"
        />
        <KpiCard
          label="Void Transit"
          value={kpis.voidAvg}
          unit="ms"
          accent="danger-red"
          barPct={kpis.maxLatency > 0 ? (kpis.voidAvg / kpis.maxLatency) * 100 : 0}
          icon="explore"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Latency Trend */}
        <div className="col-span-12 lg:col-span-8 glass-card p-widget-padding min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>show_chart</span>
              <h2 className="text-headline-sm text-on-surface">Latency Trend</h2>
            </div>
            <span className="text-label-caps text-primary/70 bg-primary/10 px-2 py-1 rounded">
              REAL-TIME TELEMETRY
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {trendData.length > 1 ? (
              <LatencyTrendChart data={trendData} />
            ) : (
              <p className="text-body-sm text-on-surface-variant">
                Send at least 2 packets to view the latency trend.
              </p>
            )}
          </div>
        </div>

        {/* Latency Breakdown Donut */}
        <div className="col-span-12 lg:col-span-4 glass-card p-widget-padding min-h-[400px] flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>donut_large</span>
            <h2 className="text-headline-sm text-on-surface">Latency Breakdown</h2>
          </div>
          <div className="flex-1 flex items-center justify-center">
            {allHops.length > 0 ? (
              <DonutChart segments={donutSegments} total={kpis.fiberAvg + kpis.towerAvg + kpis.voidAvg} />
            ) : (
              <p className="text-body-sm text-on-surface-variant text-center">
                No hop data to break down yet.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Lower Row */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* Hop Comparison */}
        <div className="col-span-12 lg:col-span-5 glass-card p-widget-padding">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-secondary" style={{ fontSize: 20 }}>compare_arrows</span>
            <h2 className="text-headline-sm text-on-surface">Hop Comparison</h2>
          </div>
          <HopComparisonChart data={hopBarData} />
        </div>

        {/* Hop Telemetry Table */}
        <div className="col-span-12 lg:col-span-7 glass-card p-widget-padding">
          <div className="flex items-center gap-3 mb-5">
            <span className="material-symbols-outlined text-tertiary" style={{ fontSize: 20 }}>table_chart</span>
            <h2 className="text-headline-sm text-on-surface">Hop Telemetry</h2>
          </div>
          <TelemetryTable packets={tablePackets} />
        </div>
      </div>
    </div>
  );
}
