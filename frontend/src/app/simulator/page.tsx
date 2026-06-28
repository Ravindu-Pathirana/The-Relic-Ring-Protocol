'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchPlanets, sendPacket } from '@/lib/api';
import type { PlanetNode, Packet, HopLogEntry } from '@/types';

type Priority = 'STD' | 'URG';

function generatePacketId(): string {
  const hex = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
  return `PKT-${hex.toUpperCase()}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function computeHopCumulativeLatency(hop: HopLogEntry): number {
  return (
    hop.fiber_latency_ms +
    hop.tower_delay_ms +
    (hop.void_latency_ms ?? 0) +
    (hop.atmospheric_delay_ms ?? 0)
  );
}

export default function SimulatorPage() {
  // ── State ──
  const [planets, setPlanets] = useState<PlanetNode[]>([]);
  const [loadingPlanets, setLoadingPlanets] = useState(true);
  const [planetsError, setPlanetsError] = useState<string | null>(null);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [payload, setPayload] = useState('Hello world');
  const [priority, setPriority] = useState<Priority>('STD');

  const [packetResult, setPacketResult] = useState<Packet | null>(null);
  const [packetId, setPacketId] = useState<string | null>(null);
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation progress: 0 to 1
  const [animProgress, setAnimProgress] = useState(0);
  const animRef = useRef<number | null>(null);

  // ── Fetch planets ──
  const loadPlanets = useCallback(async () => {
    setLoadingPlanets(true);
    setPlanetsError(null);
    try {
      const data = await fetchPlanets();
      setPlanets(data);
      if (data.length > 0) {
        setOrigin(data[0].id);
        setDestination(data.length > 1 ? data[1].id : data[0].id);
      }
    } catch (err) {
      setPlanetsError(
        err instanceof Error ? err.message : 'Failed to load planets'
      );
    } finally {
      setLoadingPlanets(false);
    }
  }, []);

  useEffect(() => {
    loadPlanets();
  }, [loadPlanets]);

  // ── Cleanup animation on unmount ──
  useEffect(() => {
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // ── Send packet handler ──
  const handleSend = async () => {
    if (!origin || !destination || !payload.trim()) return;
    setIsSending(true);
    setError(null);
    setPacketResult(null);
    setPacketId(null);
    setAnimProgress(0);
    setIsTransmitting(false);

    try {
      const result = await sendPacket(origin, destination, payload);
      setPacketResult(result);
      setPacketId(generatePacketId());

      // Trigger transmission animation
      setIsTransmitting(true);
      const startTime = performance.now();
      const duration = 2500;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setAnimProgress(progress);
        if (progress < 1) {
          animRef.current = requestAnimationFrame(animate);
        } else {
          setIsTransmitting(false);
          animRef.current = null;
        }
      };
      animRef.current = requestAnimationFrame(animate);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to send packet'
      );
    } finally {
      setIsSending(false);
    }
  };

  // ── Derived data ──
  const hopCount = packetResult ? packetResult.hop_log.length : 0;
  const currentHopIndex = packetResult
    ? isTransmitting
      ? Math.min(
          Math.floor(animProgress * hopCount),
          hopCount - 1
        )
      : hopCount - 1
    : 0;

  const encodingProgress = packetResult
    ? isTransmitting
      ? Math.min(animProgress * 3, 1) * 100
      : 100
    : 0;
  const transmittingProgress = packetResult
    ? isTransmitting
      ? Math.max(0, Math.min((animProgress - 0.2) * 2, 1)) * 100
      : 100
    : 0;
  const decodingProgress = packetResult
    ? isTransmitting
      ? Math.max(0, Math.min((animProgress - 0.6) * 2.5, 1)) * 100
      : 100
    : 0;

  // ── Skeleton block helper ──
  const Skeleton = ({ className = '' }: { className?: string }) => (
    <div
      className={`bg-surface-container-high rounded animate-pulse ${className}`}
    />
  );

  // ── SVG dimensions ──
  const svgWidth = 600;
  const svgHeight = 280;
  const originX = svgWidth * 0.15;
  const destX = svgWidth * 0.85;
  const centerY = svgHeight * 0.45;

  return (
    <div className="p-widget-padding">
      {/* ── 3-column grid ── */}
      <div className="grid grid-cols-12 gap-4">
        {/* ═══ Left Column: Configuration ═══ */}
        <div className="col-span-3">
          <div className="glass-card p-widget-padding">
            <h2 className="text-label-caps text-on-surface-variant mb-6">
              Packet Configuration
            </h2>

            {loadingPlanets ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : planetsError ? (
              <div className="space-y-3">
                <p className="text-body-sm text-danger-red">{planetsError}</p>
                <button
                  onClick={loadPlanets}
                  className="text-body-sm text-primary underline"
                >
                  Retry
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Origin */}
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-2 block">
                    Origin Node
                  </label>
                  <select
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full bg-surface-container border border-border-white rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  >
                    {planets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {capitalize(p.id)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destination */}
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-2 block">
                    Destination Node
                  </label>
                  <select
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full bg-surface-container border border-border-white rounded-lg px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-primary"
                  >
                    {planets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {capitalize(p.id)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payload */}
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-2 block">
                    Message Payload
                  </label>
                  <textarea
                    value={payload}
                    onChange={(e) => setPayload(e.target.value)}
                    rows={4}
                    placeholder="Enter message..."
                    className="w-full bg-surface-container border border-border-white rounded-lg px-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary resize-none"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-2 block">
                    Priority Level
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPriority('STD')}
                      className={`flex-1 py-2 rounded-lg text-body-sm font-semibold transition-colors ${
                        priority === 'STD'
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      STD
                    </button>
                    <button
                      onClick={() => setPriority('URG')}
                      className={`flex-1 py-2 rounded-lg text-body-sm font-semibold transition-colors ${
                        priority === 'URG'
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      URG
                    </button>
                  </div>
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSend}
                  disabled={isSending || !payload.trim()}
                  className={`w-full bg-primary text-on-primary font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-opacity ${
                    isSending || !payload.trim()
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:opacity-90'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    send
                  </span>
                  {isSending ? 'SENDING...' : 'SEND PACKET'}
                </button>

                {error && (
                  <p className="text-body-sm text-danger-red mt-2">{error}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══ Center Column: Live Transmission Map ═══ */}
        <div className="col-span-6">
          <div className="glass-card p-widget-padding">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-label-caps text-on-surface-variant">
                Live Transmission Feed
              </h2>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    isTransmitting
                      ? 'bg-success-green animate-node-pulse'
                      : 'bg-outline'
                  }`}
                />
                <span
                  className={`text-label-caps ${
                    isTransmitting ? 'text-success-green' : 'text-outline'
                  }`}
                >
                  {isTransmitting ? 'LIVE' : 'IDLE'}
                </span>
              </div>
            </div>

            {/* SVG Visualization */}
            <div className="relative">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full"
                style={{ minHeight: '240px' }}
              >
                <defs>
                  <filter id="glow-laser">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="glow-dot">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <radialGradient id="planet-origin" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#c5c0ff" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#c5c0ff" stopOpacity="0.15" />
                  </radialGradient>
                  <radialGradient id="planet-dest" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#7bd0ff" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#7bd0ff" stopOpacity="0.15" />
                  </radialGradient>
                </defs>

                {origin && destination ? (
                  <>
                    {/* Connection line */}
                    <line
                      x1={originX}
                      y1={centerY}
                      x2={destX}
                      y2={centerY}
                      stroke="#7bd0ff"
                      strokeWidth="1"
                      strokeOpacity={isTransmitting ? 0.6 : 0.2}
                      strokeDasharray="6 4"
                      className={isTransmitting ? 'animate-link-dash' : ''}
                    />

                    {/* Laser glow line (visible during transmission) */}
                    {isTransmitting && (
                      <line
                        x1={originX}
                        y1={centerY}
                        x2={destX}
                        y2={centerY}
                        stroke="#7bd0ff"
                        strokeWidth="2"
                        filter="url(#glow-laser)"
                        className="animate-laser-line"
                      />
                    )}

                    {/* Origin planet */}
                    <circle
                      cx={originX}
                      cy={centerY}
                      r="28"
                      fill="url(#planet-origin)"
                      stroke="#c5c0ff"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={originX}
                      cy={centerY}
                      r="8"
                      fill="#c5c0ff"
                      fillOpacity="0.8"
                    />
                    <text
                      x={originX}
                      y={centerY + 46}
                      textAnchor="middle"
                      fill="#c5c0ff"
                      fontSize="12"
                      fontFamily="var(--font-mono)"
                      fontWeight="600"
                    >
                      {capitalize(origin)}
                    </text>
                    <text
                      x={originX}
                      y={centerY + 60}
                      textAnchor="middle"
                      fill="#928ea1"
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                    >
                      ORIGIN
                    </text>

                    {/* Destination planet */}
                    <circle
                      cx={destX}
                      cy={centerY}
                      r="28"
                      fill="url(#planet-dest)"
                      stroke="#7bd0ff"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={destX}
                      cy={centerY}
                      r="8"
                      fill="#7bd0ff"
                      fillOpacity="0.8"
                    />
                    <text
                      x={destX}
                      y={centerY + 46}
                      textAnchor="middle"
                      fill="#7bd0ff"
                      fontSize="12"
                      fontFamily="var(--font-mono)"
                      fontWeight="600"
                    >
                      {capitalize(destination)}
                    </text>
                    <text
                      x={destX}
                      y={centerY + 60}
                      textAnchor="middle"
                      fill="#928ea1"
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                    >
                      DESTINATION
                    </text>

                    {/* Animated packet dot */}
                    {isTransmitting && (
                      <circle
                        cx={originX + (destX - originX) * animProgress}
                        cy={centerY}
                        r="5"
                        fill="#ffb785"
                        filter="url(#glow-dot)"
                      />
                    )}

                    {/* Delivered indicator */}
                    {packetResult && !isTransmitting && (
                      <circle
                        cx={destX}
                        cy={centerY}
                        r="5"
                        fill="#00D084"
                        filter="url(#glow-dot)"
                      />
                    )}
                  </>
                ) : (
                  <text
                    x={svgWidth / 2}
                    y={svgHeight / 2}
                    textAnchor="middle"
                    fill="#928ea1"
                    fontSize="13"
                    fontFamily="var(--font-body)"
                  >
                    Select origin and destination to begin
                  </text>
                )}
              </svg>

              {/* ETA overlay */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                <div className="glass-panel rounded-lg px-4 py-2 flex items-center gap-6">
                  <div className="text-center">
                    <span className="text-label-caps text-on-surface-variant block text-[9px]">
                      Est. Arrival
                    </span>
                    <span className="text-data-mono text-on-surface text-sm">
                      {packetResult
                        ? `${packetResult.total_latency_ms.toFixed(1)} ms`
                        : '-- ms'}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-border-white" />
                  <div className="text-center">
                    <span className="text-label-caps text-on-surface-variant block text-[9px]">
                      Hops
                    </span>
                    <span className="text-data-mono text-on-surface text-sm">
                      {packetResult
                        ? `${packetResult.hop_log.length}`
                        : '--'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom controls bar */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-white">
              <div className="flex items-center gap-3">
                <button className="text-on-surface-variant hover:text-on-surface transition-colors">
                  <span className="material-symbols-outlined text-[20px]">
                    play_arrow
                  </span>
                </button>
                <span className="text-data-mono text-on-surface-variant text-xs">
                  1x
                </span>
              </div>
              <button className="text-on-surface-variant hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[20px]">
                  fullscreen
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* ═══ Right Column: Packet Status ═══ */}
        <div className="col-span-3 flex flex-col gap-4">
          {/* Active Packet */}
          <div className="glass-card p-widget-padding">
            <h3 className="text-label-caps text-on-surface-variant mb-3">
              Active Packet
            </h3>
            <p className="text-data-mono text-on-surface text-lg">
              {packetId ?? '--'}
            </p>
            {packetResult && (
              <span
                className={`inline-block mt-2 text-label-caps px-2 py-0.5 rounded ${
                  packetResult.status === 'delivered'
                    ? 'bg-success-green/20 text-success-green'
                    : packetResult.status === 'undeliverable'
                      ? 'bg-danger-red/20 text-danger-red'
                      : 'bg-warning-gold/20 text-warning-gold'
                }`}
              >
                {packetResult.status}
              </span>
            )}
          </div>

          {/* Current Hop */}
          <div className="glass-card p-widget-padding">
            <h3 className="text-label-caps text-on-surface-variant mb-3">
              Current Hop
            </h3>
            {packetResult && hopCount > 0 ? (
              <div>
                <p className="text-headline-sm text-on-surface">
                  {capitalize(
                    packetResult.hop_log[currentHopIndex].planet_id
                  )}
                </p>
                <p className="text-data-mono text-on-surface-variant mt-1">
                  Hop {currentHopIndex + 1}/{hopCount}
                </p>
              </div>
            ) : (
              <p className="text-data-mono text-outline">--</p>
            )}
          </div>

          {/* Protocol Stage */}
          <div className="glass-card p-widget-padding">
            <h3 className="text-label-caps text-on-surface-variant mb-3">
              Protocol Stage
            </h3>
            <div className="space-y-3">
              {/* Encoding */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-body-sm text-on-surface-variant">
                    Encoding
                  </span>
                  <span className="text-data-mono text-on-surface-variant text-xs">
                    {Math.round(encodingProgress)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-200"
                    style={{ width: `${encodingProgress}%` }}
                  />
                </div>
              </div>
              {/* Transmitting */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-body-sm text-on-surface-variant">
                    Transmitting
                  </span>
                  <span className="text-data-mono text-on-surface-variant text-xs">
                    {Math.round(transmittingProgress)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-200"
                    style={{ width: `${transmittingProgress}%` }}
                  />
                </div>
              </div>
              {/* Decoding */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-body-sm text-on-surface-variant">
                    Decoding
                  </span>
                  <span className="text-data-mono text-on-surface-variant text-xs">
                    {Math.round(decodingProgress)}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className="h-full bg-tertiary rounded-full transition-all duration-200"
                    style={{ width: `${decodingProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Latency Accumulation */}
          <div className="glass-card p-widget-padding">
            <h3 className="text-label-caps text-on-surface-variant mb-3">
              Latency Accumulation
            </h3>
            <p className="text-data-mono text-on-surface text-2xl mb-3">
              {packetResult
                ? `${packetResult.total_latency_ms.toFixed(2)} ms`
                : '-- ms'}
            </p>
            {/* Mini bar chart */}
            <div className="flex items-end gap-1 h-12">
              {packetResult && hopCount > 0 ? (
                (() => {
                  const hopLatencies = packetResult.hop_log.map(
                    computeHopCumulativeLatency
                  );
                  const maxLatency = Math.max(...hopLatencies, 1);
                  return hopLatencies.map((lat, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-secondary rounded-t transition-all duration-300"
                      style={{
                        height: `${(lat / maxLatency) * 100}%`,
                        minHeight: '4px',
                      }}
                      title={`Hop ${i + 1}: ${lat.toFixed(1)} ms`}
                    />
                  ));
                })()
              ) : (
                <>
                  {Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-surface-container-high rounded-t"
                      style={{ height: `${20 + i * 15}%` }}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Bottom: Hop Timeline ═══ */}
      <div className="glass-card p-widget-padding mt-4">
        <h2 className="text-label-caps text-on-surface-variant mb-5">
          Hop Timeline
        </h2>

        {packetResult && hopCount > 0 ? (
          <div className="overflow-x-auto">
            <div className="flex items-start min-w-max px-4">
              {packetResult.hop_log.map((hop, index) => {
                const isCompleted = !isTransmitting || index <= currentHopIndex;
                const isActive =
                  isTransmitting && index === currentHopIndex;
                const isFinal = index === hopCount - 1;
                const cumulativeLatency = packetResult.hop_log
                  .slice(0, index + 1)
                  .reduce(
                    (sum, h) => sum + computeHopCumulativeLatency(h),
                    0
                  );

                return (
                  <div key={index} className="flex items-start">
                    {/* Node */}
                    <div className="flex flex-col items-center" style={{ minWidth: '80px' }}>
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                          isActive
                            ? 'border-secondary bg-secondary/30 text-secondary'
                            : isCompleted
                              ? 'border-success-green bg-success-green/20 text-success-green'
                              : 'border-outline bg-surface-container text-outline'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span
                        className={`text-data-mono text-xs mt-2 ${
                          isCompleted
                            ? 'text-on-surface'
                            : 'text-outline'
                        }`}
                      >
                        {capitalize(hop.planet_id)}
                      </span>
                      <span className="text-data-mono text-on-surface-variant text-[10px] mt-0.5">
                        {cumulativeLatency.toFixed(1)} ms
                      </span>
                    </div>

                    {/* Connecting line */}
                    {!isFinal && (
                      <div className="flex items-center pt-3.5">
                        <div
                          className={`h-0.5 transition-all duration-300 ${
                            isCompleted
                              ? 'bg-success-green'
                              : 'bg-outline/40'
                          }`}
                          style={{ width: '48px' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-outline text-4xl mb-2 block">
              route
            </span>
            <p className="text-body-sm text-outline">
              Send a packet to see hop timeline
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
