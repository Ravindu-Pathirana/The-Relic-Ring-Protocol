'use client';

import { useEffect, useState, useMemo } from 'react';
import { fetchPlanets, fetchRoute } from '@/lib/api';
import type { PlanetNode } from '@/types';

interface PlanetLink {
  from: string;
  to: string;
  latency: number;
}

const PLANET_COLORS: Record<string, { fill: string; stroke: string; glow: string }> = {
  aegis:   { fill: 'rgba(197,192,255,0.3)', stroke: '#c5c0ff', glow: 'rgba(197,192,255,0.6)' },
  boreas:  { fill: 'rgba(123,208,255,0.3)', stroke: '#7bd0ff', glow: 'rgba(123,208,255,0.8)' },
  caelum:  { fill: 'rgba(0,208,132,0.2)',   stroke: '#00D084', glow: 'rgba(0,208,132,0.5)' },
  dawn:    { fill: 'rgba(255,176,32,0.3)',   stroke: '#FFB020', glow: 'rgba(255,176,32,0.6)' },
  elysium: { fill: 'rgba(197,192,255,0.2)', stroke: '#c5c0ff', glow: 'rgba(197,192,255,0.4)' },
  fenix:   { fill: 'rgba(240,68,56,0.3)',    stroke: '#F04438', glow: 'rgba(240,68,56,0.6)' },
  genesis: { fill: 'rgba(123,208,255,0.2)', stroke: '#7bd0ff', glow: 'rgba(123,208,255,0.4)' },
  helios:  { fill: 'rgba(255,183,133,0.3)', stroke: '#ffb785', glow: 'rgba(255,183,133,0.5)' },
};

const HUB_ID = 'caelum';

export default function DashboardPage() {
  const [planets, setPlanets] = useState<PlanetNode[]>([]);
  const [links, setLinks] = useState<PlanetLink[]>([]);
  const [selected, setSelected] = useState<PlanetNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlanets()
      .then(async (data) => {
        setPlanets(data);
        const newLinks: PlanetLink[] = [];
        for (let i = 0; i < data.length; i++) {
          for (let j = i + 1; j < data.length; j++) {
            try {
              const route = await fetchRoute(data[i].id, data[j].id);
              if (route.feasible && route.path.length === 2) {
                newLinks.push({ from: data[i].id, to: data[j].id, latency: route.total_latency_ms });
              }
            } catch { /* skip */ }
          }
        }
        setLinks(newLinks);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const mapW = 800, mapH = 550, pad = 80;

  const positions = useMemo(() => {
    if (planets.length === 0) return new Map<string, { x: number; y: number }>();
    const xs = planets.map(n => n.x);
    const ys = planets.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
    const map = new Map<string, { x: number; y: number }>();
    for (const p of planets) {
      map.set(p.id, {
        x: pad + ((p.x - minX) / rangeX) * (mapW - 2 * pad),
        y: pad + ((p.y - minY) / rangeY) * (mapH - 2 * pad),
      });
    }
    return map;
  }, [planets]);

  const avgLatency = links.length > 0
    ? Math.round(links.reduce((s, l) => s + l.latency, 0) / links.length)
    : 0;

  const getColors = (id: string) => PLANET_COLORS[id] || PLANET_COLORS.aegis;
  const isHub = (id: string) => id === HUB_ID;

  return (
    <div className="flex gap-gutter p-gutter h-[calc(100vh-4rem)]">
      {/* Map Area */}
      <section className="flex-1 glass-panel rounded-xl flex flex-col overflow-hidden relative">
        <div className="p-4 border-b border-border-white flex justify-between items-center bg-surface-card/50 z-20">
          <h2 className="text-headline-sm text-on-surface">Telemetry Sector: Alpha</h2>
          <div className="flex gap-2">
            {['zoom_in', 'zoom_out', 'filter_center_focus'].map(icon => (
              <button key={icon} className="p-1.5 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 text-on-surface-variant transition-colors">
                <span className="material-symbols-outlined text-sm">{icon}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 relative cursor-move">
          {loading ? (
            <div className="flex items-center justify-center h-full text-on-surface-variant text-data-mono">
              <span className="material-symbols-outlined animate-pulse mr-2">public</span>
              Initializing universe...
            </div>
          ) : (
            <svg viewBox={`0 0 ${mapW} ${mapH}`} className="w-full h-full">
              <defs>
                <filter id="node-glow">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <filter id="hub-glow">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {/* Connection Lines */}
              {links.map((link) => {
                const s1 = positions.get(link.from);
                const s2 = positions.get(link.to);
                if (!s1 || !s2) return null;
                const isHubLink = link.from === HUB_ID || link.to === HUB_ID;
                return (
                  <line key={`${link.from}-${link.to}`}
                    x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y}
                    stroke={isHubLink ? '#00D084' : '#c5c0ff'}
                    strokeOpacity={isHubLink ? 0.5 : 0.25}
                    strokeWidth={isHubLink ? 1.5 : 1}
                    strokeDasharray={isHubLink ? '8 4' : '6 4'}
                  >
                    {isHubLink && (
                      <animate attributeName="stroke-dashoffset" from="24" to="0" dur="3s" repeatCount="indefinite" />
                    )}
                  </line>
                );
              })}

              {/* Planet Nodes */}
              {planets.map((planet) => {
                const pos = positions.get(planet.id);
                if (!pos) return null;
                const isSelected = selected?.id === planet.id;
                const hub = isHub(planet.id);
                const colors = getColors(planet.id);
                const size = hub ? 16 : Math.max(6, Math.min(12, planet.radius_km / 1000));
                const isFenix = planet.id === 'fenix';

                return (
                  <g key={planet.id} onClick={() => setSelected(planet)} className="cursor-pointer">
                    {/* Click target */}
                    <circle cx={pos.x} cy={pos.y} r={size + 10} fill="transparent" />

                    {/* Outer glow ring */}
                    {(hub || isSelected) && (
                      <circle cx={pos.x} cy={pos.y} r={size + 6}
                        fill="none" stroke={colors.stroke} strokeOpacity={0.2} strokeWidth={1}
                        filter={hub ? 'url(#hub-glow)' : undefined}
                      />
                    )}

                    {/* Main circle */}
                    <circle cx={pos.x} cy={pos.y} r={size}
                      fill={colors.fill} stroke={colors.stroke}
                      strokeWidth={isSelected ? 2.5 : hub ? 2 : 1.5}
                      filter="url(#node-glow)"
                      style={{ filter: `drop-shadow(0 0 ${hub ? 12 : 6}px ${colors.glow})` }}
                    />

                    {/* Hub inner dot */}
                    {hub && (
                      <circle cx={pos.x} cy={pos.y} r={4} fill="#00D084" />
                    )}

                    {/* Non-hub center dot */}
                    {!hub && (
                      <circle cx={pos.x} cy={pos.y} r={size * 0.35} fill={colors.stroke} fillOpacity={0.8} />
                    )}

                    {/* Planet label */}
                    <text x={pos.x} y={pos.y + size + 18}
                      textAnchor="middle" fontSize="9"
                      fontFamily="'JetBrains Mono', monospace"
                      letterSpacing="0.1em" fontWeight="700"
                      fill={isFenix ? '#F04438' : hub ? '#00D084' : '#dfe1f6'}
                    >
                      {planet.id.toUpperCase()}{isFenix ? ' (WARN)' : hub ? ' (HUB)' : ''}
                    </text>

                    {/* Hub label bg */}
                    {hub && (
                      <>
                        <rect x={pos.x - 40} y={pos.y + size + 8} width={80} height={16} rx={3}
                          fill="rgba(0,208,132,0.1)" stroke="rgba(0,208,132,0.3)" strokeWidth={0.5} />
                        <text x={pos.x} y={pos.y + size + 20}
                          textAnchor="middle" fontSize="9"
                          fontFamily="'JetBrains Mono', monospace"
                          letterSpacing="0.1em" fontWeight="700"
                          fill="#00D084"
                        >
                          CAELUM (HUB)
                        </text>
                      </>
                    )}
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        {/* Planet Details Slide-out */}
        <div className={`absolute right-0 top-0 bottom-0 w-80 glass-panel border-l border-white/10 flex flex-col bg-surface-card/90 z-30 transition-transform duration-500 ease-in-out ${selected ? 'translate-x-0' : 'translate-x-full'}`}>
          {selected && (
            <>
              <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-headline-sm text-on-surface flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getColors(selected.id).stroke }} />
                  {selected.id.charAt(0).toUpperCase() + selected.id.slice(1)}
                </h3>
                <button onClick={() => setSelected(null)} className="text-on-surface-variant hover:text-white">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
              <div className="p-6 flex-1 flex flex-col gap-6">
                <div>
                  <p className="text-label-caps text-on-surface-variant mb-1">CODEX VERSION</p>
                  <p className="text-data-mono text-secondary">Base {selected.codex}</p>
                </div>
                <div>
                  <p className="text-label-caps text-on-surface-variant mb-1">COORDINATES</p>
                  <p className="text-data-mono text-primary">{selected.x} / {selected.y}</p>
                </div>
                <div>
                  <p className="text-label-caps text-on-surface-variant mb-1">TOWER COUNT</p>
                  <div className="flex items-center gap-2">
                    <span className="text-display-lg text-on-surface">{selected.active_towers}</span>
                  </div>
                </div>
                <div>
                  <p className="text-label-caps text-on-surface-variant mb-1">RADIUS</p>
                  <p className="text-data-mono text-on-surface">{selected.radius_km.toLocaleString()} km</p>
                </div>
                <div>
                  <p className="text-label-caps text-on-surface-variant mb-1">ATMOSPHERE</p>
                  <p className="text-data-mono text-on-surface">{selected.atmosphere_thickness_km} km (n={selected.refraction_index})</p>
                </div>
                <div className="mt-auto">
                  <button className="w-full py-2 bg-primary-container text-on-primary-container rounded-sm text-label-caps hover:bg-inverse-primary transition-colors flex justify-center items-center gap-2">
                    <span className="material-symbols-outlined text-sm">settings_input_antenna</span>
                    INITIATE PING
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Right Sidebar Stats */}
      <aside className="w-80 flex flex-col gap-4 overflow-y-auto pr-2 pb-4">
        {/* Total Planets */}
        <div className="glass-panel rounded-xl p-widget-padding flex flex-col gap-2 hover-glow transition-all">
          <h3 className="text-label-caps text-on-surface-variant">TOTAL PLANETS</h3>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-primary">{planets.length}</span>
            <div className="w-16 h-8 relative">
              <svg className="w-full h-full" viewBox="0 0 100 40">
                <path d="M0,30 Q20,30 30,20 T60,25 T100,10" fill="none" stroke="#c5c0ff" strokeWidth="2" />
                <circle cx="100" cy="10" r="3" fill="#c5c0ff" />
              </svg>
            </div>
          </div>
        </div>

        {/* Online Nodes */}
        <div className="glass-panel rounded-xl p-widget-padding flex flex-col gap-2 hover-glow transition-all">
          <h3 className="text-label-caps text-on-surface-variant">ONLINE NODES</h3>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-secondary">{planets.length}</span>
            <span className="text-data-mono text-success-green bg-success-green/10 px-2 py-1 rounded-sm border border-success-green/20 text-xs">100%</span>
          </div>
          <div className="w-full h-1 bg-surface-container-highest rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-secondary rounded-full" style={{ width: '100%', boxShadow: '0 0 10px rgba(123,208,255,0.8)' }} />
          </div>
        </div>

        {/* Avg Latency */}
        <div className="glass-panel rounded-xl p-widget-padding flex flex-col gap-2 hover-glow transition-all">
          <h3 className="text-label-caps text-on-surface-variant">AVG LATENCY</h3>
          <div className="flex items-end justify-between">
            <span className="text-display-lg text-warning-gold">{avgLatency}<span className="text-lg text-warning-gold/50 ml-1">ms</span></span>
            <span className="material-symbols-outlined text-warning-gold">speed</span>
          </div>
          <div className="mt-2 h-16 w-full border-b border-l border-white/10 relative flex items-end justify-between px-1 gap-1">
            {[40, 60, 50, 80, 70, 90, 45].map((h, i) => (
              <div key={i} className="flex-1 bg-warning-gold/40 rounded-t hover:bg-warning-gold transition-colors cursor-crosshair"
                style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* Network Health */}
        <div className="glass-panel rounded-xl p-widget-padding flex flex-col gap-2 hover-glow transition-all flex-1">
          <h3 className="text-label-caps text-on-surface-variant">NETWORK HEALTH</h3>
          <div className="flex items-center justify-center flex-1 relative">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke="#00D084" strokeWidth="3"
                strokeDasharray="88 100" strokeDashoffset="0" strokeLinecap="round"
                style={{ filter: 'drop-shadow(0 0 6px rgba(0,208,132,0.5))' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-display-lg text-success-green">98<span className="text-xl">%</span></span>
            </div>
          </div>
          <div className="flex justify-between text-xs mt-2 text-data-mono text-on-surface-variant border-t border-white/5 pt-2">
            <span>SECTORS: {Math.ceil(planets.length / 2)}/{Math.ceil(planets.length / 2)}</span>
            <span className="text-danger-red">ERR: 0.02%</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
