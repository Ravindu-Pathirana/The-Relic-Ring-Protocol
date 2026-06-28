'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { fetchPacketHistory, fetchPlanets } from '@/lib/api';
import type { Packet, PlanetNode, PacketStatus } from '@/types';

/* ================================================================== */
/* Shared Constants & Utilities                                        */
/* ================================================================== */

const ITEMS_PER_PAGE = 10;

type StatusFilterKey = 'SUCCESS' | 'FAILURE' | 'REROUTED';

const STATUS_FILTER_MAP: Record<StatusFilterKey, PacketStatus[]> = {
  SUCCESS: ['delivered'],
  FAILURE: ['undeliverable'],
  REROUTED: ['in_transit', 'pending'],
};

const STATUS_DISPLAY: Record<
  PacketStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  delivered: {
    label: 'SUCCESS',
    dotClass: 'bg-success-green',
    textClass: 'text-success-green',
  },
  undeliverable: {
    label: 'FAILURE',
    dotClass: 'bg-danger-red',
    textClass: 'text-danger-red',
  },
  in_transit: {
    label: 'IN TRANSIT',
    dotClass: 'bg-warning-gold',
    textClass: 'text-warning-gold',
  },
  pending: {
    label: 'PENDING',
    dotClass: 'bg-primary',
    textClass: 'text-primary',
  },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function generatePacketId(index: number): string {
  return `PKT-${index.toString().padStart(4, '0')}`;
}

type ActiveTab = 'visualization' | 'hoplog';

/* ================================================================== */
/* Journey Visualization Stage Constants                               */
/* ================================================================== */

const LIFECYCLE_STAGES = [
  'ASCII',
  'CODEX',
  'BINARY',
  'UPLINK',
  'LASER',
  'FIBER',
  'DEST',
] as const;

type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

const STAGE_ICONS: Record<LifecycleStage, string> = {
  ASCII: 'text_fields',
  CODEX: 'translate',
  BINARY: 'memory',
  UPLINK: 'cell_tower',
  LASER: 'flashlight_on',
  FIBER: 'cable',
  DEST: 'flag',
};

/* ================================================================== */
/* Main Page Component                                                 */
/* ================================================================== */

export default function JourneyPage() {
  const [packets, setPackets] = useState<Packet[]>([]);
  const [planets, setPlanets] = useState<PlanetNode[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<ActiveTab>('visualization');

  // Filter state
  const [planetFilter, setPlanetFilter] = useState('all');
  const [statusFilters, setStatusFilters] = useState<Set<StatusFilterKey>>(
    new Set(['SUCCESS', 'FAILURE', 'REROUTED'])
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Applied filters (only update when APPLY is clicked)
  const [appliedPlanetFilter, setAppliedPlanetFilter] = useState('all');
  const [appliedStatusFilters, setAppliedStatusFilters] = useState<
    Set<StatusFilterKey>
  >(new Set(['SUCCESS', 'FAILURE', 'REROUTED']));
  const [appliedDateFrom, setAppliedDateFrom] = useState('');
  const [appliedDateTo, setAppliedDateTo] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [packetsData, planetsData] = await Promise.all([
          fetchPacketHistory(),
          fetchPlanets(),
        ]);
        if (!cancelled) {
          setPackets(packetsData);
          setPlanets(planetsData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load data'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const planetMap = useMemo(() => {
    const map = new Map<string, PlanetNode>();
    for (const p of planets) {
      map.set(p.id, p);
    }
    return map;
  }, [planets]);

  const filteredPackets = useMemo(() => {
    return packets.filter((pkt) => {
      // Planet filter
      if (
        appliedPlanetFilter !== 'all' &&
        pkt.origin_id !== appliedPlanetFilter &&
        pkt.destination_id !== appliedPlanetFilter
      ) {
        return false;
      }

      // Status filter
      const matchesStatus = Array.from(appliedStatusFilters).some((key) =>
        STATUS_FILTER_MAP[key].includes(pkt.status)
      );
      if (appliedStatusFilters.size > 0 && !matchesStatus) {
        return false;
      }
      if (appliedStatusFilters.size === 0) {
        return false;
      }

      // Date range filter
      const pktTimestamp = pkt.timestamp;
      if (pktTimestamp != null) {
        if (appliedDateFrom) {
          const fromMs = new Date(appliedDateFrom).getTime();
          if (pktTimestamp < fromMs) return false;
        }
        if (appliedDateTo) {
          const toMs = new Date(appliedDateTo).getTime() + 86400000;
          if (pktTimestamp >= toMs) return false;
        }
      }

      return true;
    });
  }, [packets, appliedPlanetFilter, appliedStatusFilters, appliedDateFrom, appliedDateTo]);

  const totalPages = Math.max(1, Math.ceil(filteredPackets.length / ITEMS_PER_PAGE));
  const paginatedPackets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPackets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPackets, currentPage]);

  // KPI computations
  const totalPackets = packets.length;

  const avgLatency = useMemo(() => {
    if (packets.length === 0) return 0;
    const sum = packets.reduce((acc, p) => acc + p.total_latency_ms, 0);
    return sum / packets.length;
  }, [packets]);

  const successRate = useMemo(() => {
    if (packets.length === 0) return 0;
    const delivered = packets.filter((p) => p.status === 'delivered').length;
    return (delivered / packets.length) * 100;
  }, [packets]);

  const totalDataVolume = useMemo(() => {
    return packets.reduce((acc, p) => acc + p.payload.length, 0);
  }, [packets]);

  const handleApplyFilters = useCallback(() => {
    setAppliedPlanetFilter(planetFilter);
    setAppliedStatusFilters(new Set(statusFilters));
    setAppliedDateFrom(dateFrom);
    setAppliedDateTo(dateTo);
    setCurrentPage(1);
    setSelectedPacket(null);
    setSelectedIndex(null);
  }, [planetFilter, statusFilters, dateFrom, dateTo]);

  const handleResetFilters = useCallback(() => {
    setPlanetFilter('all');
    setStatusFilters(new Set(['SUCCESS', 'FAILURE', 'REROUTED']));
    setDateFrom('');
    setDateTo('');
    setAppliedPlanetFilter('all');
    setAppliedStatusFilters(new Set(['SUCCESS', 'FAILURE', 'REROUTED']));
    setAppliedDateFrom('');
    setAppliedDateTo('');
    setCurrentPage(1);
    setSelectedPacket(null);
    setSelectedIndex(null);
  }, []);

  const toggleStatusFilter = useCallback((key: StatusFilterKey) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelectPacket = useCallback(
    (pkt: Packet, globalIndex: number) => {
      if (selectedIndex === globalIndex) {
        setSelectedPacket(null);
        setSelectedIndex(null);
      } else {
        setSelectedPacket(pkt);
        setSelectedIndex(globalIndex);
      }
    },
    [selectedIndex]
  );

  const handleVisualizePacket = useCallback(
    (pkt: Packet, globalIndex: number) => {
      setSelectedPacket(pkt);
      setSelectedIndex(globalIndex);
      setActiveTab('visualization');
    },
    []
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-widget-padding">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-body-md text-on-surface-variant">
            Loading packet history...
          </span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-widget-padding">
        <div className="glass-card p-widget-padding flex flex-col items-center gap-4 max-w-md">
          <span className="material-symbols-outlined text-[48px] text-danger-red">
            error
          </span>
          <p className="text-body-md text-on-surface text-center">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-on-primary py-2 px-6 rounded-lg text-label-caps hover:opacity-90 transition-opacity"
          >
            RETRY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Tab Toggle */}
      <div className="px-widget-padding pt-widget-padding pb-0 flex items-center gap-0">
        <button
          onClick={() => setActiveTab('visualization')}
          className={`px-6 py-2.5 text-label-caps rounded-t-lg border border-b-0 transition-colors ${
            activeTab === 'visualization'
              ? 'bg-surface-container-high text-primary border-border-white'
              : 'bg-transparent text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container/50'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
            Journey Visualization
          </span>
        </button>
        <button
          onClick={() => setActiveTab('hoplog')}
          className={`px-6 py-2.5 text-label-caps rounded-t-lg border border-b-0 transition-colors ${
            activeTab === 'hoplog'
              ? 'bg-surface-container-high text-primary border-border-white'
              : 'bg-transparent text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container/50'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">table_rows</span>
            Hop Log History
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'visualization' ? (
        <JourneyVisualization
          selectedPacket={selectedPacket}
          selectedIndex={selectedIndex}
          planetMap={planetMap}
          onSelectFromHistory={() => setActiveTab('hoplog')}
        />
      ) : (
        <HopLogHistory
          packets={packets}
          planets={planets}
          planetMap={planetMap}
          paginatedPackets={paginatedPackets}
          totalPackets={totalPackets}
          avgLatency={avgLatency}
          successRate={successRate}
          totalDataVolume={totalDataVolume}
          currentPage={currentPage}
          totalPages={totalPages}
          selectedPacket={selectedPacket}
          selectedIndex={selectedIndex}
          planetFilter={planetFilter}
          statusFilters={statusFilters}
          dateFrom={dateFrom}
          dateTo={dateTo}
          setCurrentPage={setCurrentPage}
          setPlanetFilter={setPlanetFilter}
          toggleStatusFilter={toggleStatusFilter}
          setDateFrom={setDateFrom}
          setDateTo={setDateTo}
          handleApplyFilters={handleApplyFilters}
          handleResetFilters={handleResetFilters}
          handleSelectPacket={handleSelectPacket}
          handleVisualizePacket={handleVisualizePacket}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/* Journey Visualization Tab                                           */
/* ================================================================== */

interface JourneyVisualizationProps {
  selectedPacket: Packet | null;
  selectedIndex: number | null;
  planetMap: Map<string, PlanetNode>;
  onSelectFromHistory: () => void;
}

function JourneyVisualization({
  selectedPacket,
  selectedIndex,
  planetMap,
  onSelectFromHistory,
}: JourneyVisualizationProps) {
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animation tick interval (50ms base)
  const TICK_MS = 50;
  // Duration per stage in ms at 1x speed
  const STAGE_DURATION_MS = 2000;

  // Reset when packet changes
  useEffect(() => {
    setActiveStageIndex(0);
    setIsPlaying(false);
    setElapsedMs(0);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [selectedPacket]);

  // Playback loop
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setElapsedMs((prev) => {
          const next = prev + TICK_MS * playbackSpeed;
          const totalDuration = LIFECYCLE_STAGES.length * STAGE_DURATION_MS;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return totalDuration;
          }
          return next;
        });
      }, TICK_MS);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed]);

  // Derive active stage from elapsed time
  useEffect(() => {
    const stageIdx = Math.min(
      Math.floor(elapsedMs / STAGE_DURATION_MS),
      LIFECYCLE_STAGES.length - 1
    );
    setActiveStageIndex(stageIdx);
  }, [elapsedMs]);

  const handlePlayPause = useCallback(() => {
    if (!selectedPacket) return;
    const totalDuration = LIFECYCLE_STAGES.length * STAGE_DURATION_MS;
    if (elapsedMs >= totalDuration) {
      // Reset and play
      setElapsedMs(0);
      setActiveStageIndex(0);
      setIsPlaying(true);
    } else {
      setIsPlaying((prev) => !prev);
    }
  }, [selectedPacket, elapsedMs]);

  const handleReplay = useCallback(() => {
    setElapsedMs(0);
    setActiveStageIndex(0);
    setIsPlaying(true);
  }, []);

  const handleSkipPrev = useCallback(() => {
    setActiveStageIndex((prev) => {
      const next = Math.max(0, prev - 1);
      setElapsedMs(next * STAGE_DURATION_MS);
      return next;
    });
    setIsPlaying(false);
  }, []);

  const handleSkipNext = useCallback(() => {
    setActiveStageIndex((prev) => {
      const next = Math.min(LIFECYCLE_STAGES.length - 1, prev + 1);
      setElapsedMs(next * STAGE_DURATION_MS);
      return next;
    });
    setIsPlaying(false);
  }, []);

  const formatTimecode = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const millis = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(2, '0')}`;
  };

  // Derive telemetry values from the selected packet
  const telemetryCards = useMemo(() => {
    if (!selectedPacket) return [];
    const hops = selectedPacket.hop_log;
    const totalTowerDelay = hops.reduce((sum, h) => sum + h.tower_delay_ms, 0);
    const totalFiberLatency = hops.reduce((sum, h) => sum + h.fiber_latency_ms, 0);
    const totalVoidLatency = hops.reduce(
      (sum, h) => sum + (h.void_latency_ms ?? 0),
      0
    );

    // Approximate: fiber speed fraction * c gives fiber ring speed
    // We display the accumulated metrics as telemetry
    return [
      {
        label: 'Tower Delay',
        value: `${totalTowerDelay.toFixed(2)} ms`,
        icon: 'cell_tower',
        color: 'text-tertiary',
        borderColor: 'border-tertiary/30',
      },
      {
        label: 'Fiber Ring',
        value: `${totalFiberLatency.toFixed(2)} ms`,
        icon: 'cable',
        color: 'text-secondary',
        borderColor: 'border-secondary/30',
      },
      {
        label: 'Void Transit',
        value: `${totalVoidLatency.toFixed(4)} ms`,
        icon: 'rocket',
        color: 'text-primary',
        borderColor: 'border-primary/30',
      },
    ];
  }, [selectedPacket]);

  // Status for the header HUD
  const statusInfo = useMemo(() => {
    if (!selectedPacket) return { label: 'NO PACKET', color: 'text-on-surface-variant' };
    const s = STATUS_DISPLAY[selectedPacket.status];
    return { label: s.label, color: s.textClass };
  }, [selectedPacket]);

  // No packet selected empty state
  if (!selectedPacket) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-widget-padding">
        <div className="glass-card p-widget-padding flex flex-col items-center gap-4 max-w-lg">
          <span className="material-symbols-outlined text-[64px] text-on-surface-variant opacity-40">
            rocket_launch
          </span>
          <span className="text-headline-sm text-on-surface text-center">
            No Packet Selected
          </span>
          <p className="text-body-sm text-on-surface-variant text-center">
            Select a packet from the Hop Log History tab to visualize its interplanetary journey lifecycle.
          </p>
          <button
            onClick={onSelectFromHistory}
            className="bg-primary text-on-primary py-2.5 px-8 rounded-lg text-label-caps hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">table_rows</span>
            BROWSE HOP LOG
          </button>
        </div>
      </div>
    );
  }

  const originPlanet = planetMap.get(selectedPacket.origin_id);
  const destPlanet = planetMap.get(selectedPacket.destination_id);
  const totalDuration = LIFECYCLE_STAGES.length * STAGE_DURATION_MS;
  const progressPercent = Math.min((elapsedMs / totalDuration) * 100, 100);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header HUD Bar */}
      <div className="glass-panel mx-widget-padding mt-3 rounded-xl px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined text-[20px] text-primary">
            satellite_alt
          </span>
          <span className="text-headline-sm text-on-surface">
            Interplanetary Packet Lifecycle
          </span>
        </div>
        <div className="flex items-center gap-6">
          {/* Packet Info */}
          <div className="flex items-center gap-2">
            <span className="text-label-caps text-on-surface-variant">PACKET</span>
            <span className="text-data-mono text-primary">
              {generatePacketId(selectedIndex ?? 0)}
            </span>
          </div>
          {/* Accumulated Latency Ticker */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-secondary">
              timer
            </span>
            <span className="text-data-mono text-secondary">
              {selectedPacket.total_latency_ms.toFixed(2)} ms
            </span>
          </div>
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full inline-block ${STATUS_DISPLAY[selectedPacket.status].dotClass}`}
            />
            <span className={`text-label-caps ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
        </div>
      </div>

      {/* Main Visualization Stage */}
      <div className="flex-1 relative mx-widget-padding mt-3 overflow-hidden rounded-xl glass-panel">
        {/* Starfield Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Decorative subtle dots as stars */}
          <div className="absolute w-1 h-1 rounded-full bg-white/20 top-[12%] left-[8%]" />
          <div className="absolute w-0.5 h-0.5 rounded-full bg-white/10 top-[25%] left-[45%]" />
          <div className="absolute w-1 h-1 rounded-full bg-white/15 top-[60%] left-[72%]" />
          <div className="absolute w-0.5 h-0.5 rounded-full bg-white/20 top-[35%] left-[28%]" />
          <div className="absolute w-1 h-1 rounded-full bg-white/10 top-[78%] left-[55%]" />
          <div className="absolute w-0.5 h-0.5 rounded-full bg-white/15 top-[15%] left-[85%]" />
          <div className="absolute w-1 h-1 rounded-full bg-white/10 top-[48%] left-[15%]" />
          <div className="absolute w-0.5 h-0.5 rounded-full bg-white/20 top-[88%] left-[35%]" />
          <div className="absolute w-1 h-1 rounded-full bg-white/15 top-[70%] left-[90%]" />
          <div className="absolute w-0.5 h-0.5 rounded-full bg-white/10 top-[5%] left-[62%]" />
        </div>

        {/* Route line across center */}
        <div className="absolute top-1/2 left-[10%] right-[10%] h-px -translate-y-1/2 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-r from-primary/20 via-secondary/30 to-primary/20" />
          {/* Animated pulse on the line */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary/60 blur-sm"
            style={{
              left: `${progressPercent}%`,
              transition: 'left 0.1s linear',
              boxShadow: '0 0 12px rgba(197, 192, 255, 0.6)',
            }}
          />
        </div>

        {/* Origin Planet Indicator */}
        <div className="absolute top-1/2 left-[6%] -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none">
          <div className="w-12 h-12 rounded-full border border-primary/40 bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px] text-primary">
              public
            </span>
          </div>
          <span className="text-label-caps text-primary">
            {originPlanet?.id ?? selectedPacket.origin_id}
          </span>
        </div>

        {/* Destination Planet Indicator */}
        <div className="absolute top-1/2 right-[6%] -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none">
          <div className="w-12 h-12 rounded-full border border-secondary/40 bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px] text-secondary">
              flag
            </span>
          </div>
          <span className="text-label-caps text-secondary">
            {destPlanet?.id ?? selectedPacket.destination_id}
          </span>
        </div>

        {/* Active Stage Label */}
        <div className="absolute top-[15%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none">
          <span className="material-symbols-outlined text-[40px] text-primary animate-pulse">
            {STAGE_ICONS[LIFECYCLE_STAGES[activeStageIndex]]}
          </span>
          <span className="text-headline-sm text-on-surface">
            {LIFECYCLE_STAGES[activeStageIndex]}
          </span>
          <span className="text-body-sm text-on-surface-variant">
            Stage {activeStageIndex + 1} of {LIFECYCLE_STAGES.length}
          </span>
        </div>

        {/* Floating Glassmorphic Telemetry Cards */}
        <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 flex items-center gap-6">
          {telemetryCards.map((card) => (
            <div
              key={card.label}
              className={`glass-card hover-glow px-5 py-4 flex flex-col items-center gap-1.5 min-w-[160px] border ${card.borderColor}`}
              style={{
                animation: 'gentle-float 4s ease-in-out infinite',
                animationDelay: `${telemetryCards.indexOf(card) * 0.7}s`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-[16px] ${card.color}`}>
                  {card.icon}
                </span>
                <span className="text-label-caps text-on-surface-variant">
                  {card.label}
                </span>
              </div>
              <span className={`text-headline-sm ${card.color}`}>
                {card.value}
              </span>
            </div>
          ))}
        </div>

        {/* Hop count badge */}
        <div className="absolute top-4 right-4 glass-card px-3 py-1.5 flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
            hub
          </span>
          <span className="text-label-caps text-on-surface-variant">
            {selectedPacket.hop_log.length} HOPS
          </span>
        </div>

        {/* Payload preview */}
        <div className="absolute top-4 left-4 glass-card px-3 py-1.5 flex items-center gap-2 max-w-[240px]">
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant">
            data_object
          </span>
          <span className="text-data-mono text-on-surface-variant truncate text-[12px]">
            &quot;{selectedPacket.payload.length > 24 ? selectedPacket.payload.slice(0, 24) + '...' : selectedPacket.payload}&quot;
          </span>
        </div>
      </div>

      {/* Progress Timeline Bar */}
      <div className="mx-widget-padding mt-3 glass-panel rounded-xl px-6 py-4">
        <div className="flex items-center gap-0 relative">
          {/* Background connecting line */}
          <div className="absolute top-1/2 left-0 right-0 h-px bg-outline-variant -translate-y-1/2 pointer-events-none" />
          {/* Active progress line */}
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 pointer-events-none transition-all duration-100"
            style={{
              width: `${(activeStageIndex / (LIFECYCLE_STAGES.length - 1)) * 100}%`,
            }}
          />

          {LIFECYCLE_STAGES.map((stage, idx) => {
            const isActive = idx === activeStageIndex;
            const isPast = idx < activeStageIndex;
            const isFuture = idx > activeStageIndex;

            return (
              <div
                key={stage}
                className="flex-1 flex flex-col items-center gap-2 relative z-10 cursor-pointer"
                onClick={() => {
                  setActiveStageIndex(idx);
                  setElapsedMs(idx * STAGE_DURATION_MS);
                  setIsPlaying(false);
                }}
              >
                {/* Node Dot */}
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? 'bg-primary border-primary scale-125'
                      : isPast
                        ? 'bg-primary/60 border-primary/60'
                        : 'bg-surface-container border-outline-variant'
                  }`}
                  style={
                    isActive
                      ? {
                          boxShadow: '0 0 12px rgba(197, 192, 255, 0.5), 0 0 24px rgba(197, 192, 255, 0.2)',
                          animation: 'node-pulse 2s ease-in-out infinite',
                        }
                      : undefined
                  }
                >
                  {isPast && (
                    <span className="material-symbols-outlined text-[10px] text-on-primary">
                      check
                    </span>
                  )}
                </div>
                {/* Stage Label */}
                <span
                  className={`text-label-caps transition-colors ${
                    isActive
                      ? 'text-primary'
                      : isPast
                        ? 'text-primary/60'
                        : isFuture
                          ? 'text-on-surface-variant/50'
                          : 'text-on-surface-variant'
                  }`}
                >
                  {stage}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Playback Controls Bar */}
      <div className="mx-widget-padding mt-3 mb-widget-padding glass-panel rounded-xl px-6 py-3 flex items-center justify-between">
        {/* Left: Transport Controls */}
        <div className="flex items-center gap-2">
          {/* Replay */}
          <button
            onClick={handleReplay}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface"
            title="Replay"
          >
            <span className="material-symbols-outlined text-[20px]">replay</span>
          </button>
          {/* Skip Previous */}
          <button
            onClick={handleSkipPrev}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={activeStageIndex === 0}
            title="Previous Stage"
          >
            <span className="material-symbols-outlined text-[20px]">skip_previous</span>
          </button>
          {/* Play / Pause */}
          <button
            onClick={handlePlayPause}
            className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-opacity"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            <span className="material-symbols-outlined text-[24px]">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          {/* Skip Next */}
          <button
            onClick={handleSkipNext}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={activeStageIndex === LIFECYCLE_STAGES.length - 1}
            title="Next Stage"
          >
            <span className="material-symbols-outlined text-[20px]">skip_next</span>
          </button>
        </div>

        {/* Center: Speed Slider */}
        <div className="flex items-center gap-3">
          <span className="text-label-caps text-on-surface-variant">SPEED</span>
          <input
            type="range"
            min="0.25"
            max="4"
            step="0.25"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="w-32 accent-primary"
          />
          <span className="text-data-mono text-primary w-10 text-right">
            {playbackSpeed}x
          </span>
        </div>

        {/* Right: Timecode & Fullscreen */}
        <div className="flex items-center gap-4">
          <span className="text-data-mono text-on-surface-variant">
            {formatTimecode(elapsedMs)} / {formatTimecode(totalDuration)}
          </span>
          <button
            onClick={() => {
              const el = document.documentElement;
              if (!document.fullscreenElement) {
                el.requestFullscreen().catch(() => {/* ignored */});
              } else {
                document.exitFullscreen().catch(() => {/* ignored */});
              }
            }}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container-high transition-colors text-on-surface-variant hover:text-on-surface"
            title="Toggle Fullscreen"
          >
            <span className="material-symbols-outlined text-[20px]">fullscreen</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Hop Log History Tab (Original Implementation)                       */
/* ================================================================== */

interface HopLogHistoryProps {
  packets: Packet[];
  planets: PlanetNode[];
  planetMap: Map<string, PlanetNode>;
  paginatedPackets: Packet[];
  totalPackets: number;
  avgLatency: number;
  successRate: number;
  totalDataVolume: number;
  currentPage: number;
  totalPages: number;
  selectedPacket: Packet | null;
  selectedIndex: number | null;
  planetFilter: string;
  statusFilters: Set<StatusFilterKey>;
  dateFrom: string;
  dateTo: string;
  setCurrentPage: (fn: (prev: number) => number) => void;
  setPlanetFilter: (value: string) => void;
  toggleStatusFilter: (key: StatusFilterKey) => void;
  setDateFrom: (value: string) => void;
  setDateTo: (value: string) => void;
  handleApplyFilters: () => void;
  handleResetFilters: () => void;
  handleSelectPacket: (pkt: Packet, globalIndex: number) => void;
  handleVisualizePacket: (pkt: Packet, globalIndex: number) => void;
}

function HopLogHistory({
  packets,
  planets,
  planetMap,
  paginatedPackets,
  totalPackets,
  avgLatency,
  successRate,
  totalDataVolume,
  currentPage,
  totalPages,
  selectedPacket,
  selectedIndex,
  planetFilter,
  statusFilters,
  dateFrom,
  dateTo,
  setCurrentPage,
  setPlanetFilter,
  toggleStatusFilter,
  setDateFrom,
  setDateTo,
  handleApplyFilters,
  handleResetFilters,
  handleSelectPacket,
  handleVisualizePacket,
}: HopLogHistoryProps) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* KPI Summary Bar */}
      <div className="grid grid-cols-4 gap-4 p-widget-padding">
        <KpiCard
          icon="package_2"
          iconColor="text-primary"
          label="Total Packets Sent"
          value={totalPackets.toString()}
          valueColor="text-primary"
        />
        <KpiCard
          icon="timer"
          iconColor="text-secondary"
          label="Avg. Latency"
          value={totalPackets > 0 ? `${avgLatency.toFixed(1)} ms` : '--'}
          valueColor="text-secondary"
        />
        <KpiCard
          icon="verified"
          iconColor="text-success-green"
          label="Success Rate"
          value={totalPackets > 0 ? `${successRate.toFixed(1)}%` : '--'}
          valueColor="text-success-green"
        />
        <KpiCard
          icon="database"
          iconColor="text-tertiary"
          label="Total Data Volume"
          value={totalPackets > 0 ? formatBytes(totalDataVolume) : '--'}
          valueColor="text-tertiary"
        />
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-row gap-4 px-widget-padding pb-widget-padding overflow-hidden">
        {/* Filter Sidebar */}
        <div className="w-64 shrink-0 glass-panel rounded-xl p-widget-padding flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              filter_list
            </span>
            <span className="text-label-caps text-on-surface-variant">
              LOG FILTERS
            </span>
          </div>

          {/* Planet Node Dropdown */}
          <div>
            <label className="text-label-caps text-on-surface-variant block mb-1.5">
              PLANET NODE
            </label>
            <select
              value={planetFilter}
              onChange={(e) => setPlanetFilter(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant rounded-lg p-compact-padding text-body-sm text-on-surface"
            >
              <option value="all">All Planets</option>
              {planets.map((planet) => (
                <option key={planet.id} value={planet.id}>
                  {planet.id}
                </option>
              ))}
            </select>
          </div>

          {/* Status Checkboxes */}
          <div>
            <span className="text-label-caps text-on-surface-variant block mb-1.5">
              STATUS
            </span>
            <div className="flex flex-col gap-2">
              {(
                [
                  { key: 'SUCCESS' as StatusFilterKey, color: 'bg-success-green' },
                  { key: 'FAILURE' as StatusFilterKey, color: 'bg-danger-red' },
                  { key: 'REROUTED' as StatusFilterKey, color: 'bg-warning-gold' },
                ] as const
              ).map(({ key, color }) => (
                <label
                  key={key}
                  className="flex items-center gap-2 cursor-pointer text-body-sm text-on-surface"
                >
                  <input
                    type="checkbox"
                    checked={statusFilters.has(key)}
                    onChange={() => toggleStatusFilter(key)}
                    className="accent-primary"
                  />
                  <span
                    className={`w-2 h-2 rounded-full ${color} inline-block`}
                  />
                  {key}
                </label>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <span className="text-label-caps text-on-surface-variant block mb-1.5">
              DATE RANGE
            </span>
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-body-sm text-on-surface-variant block mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-lg p-compact-padding text-body-sm text-on-surface"
                />
              </div>
              <div>
                <label className="text-body-sm text-on-surface-variant block mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-lg p-compact-padding text-body-sm text-on-surface"
                />
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Buttons */}
          <div>
            <button
              onClick={handleApplyFilters}
              className="w-full bg-primary text-on-primary py-2 rounded-lg text-label-caps hover:opacity-90 transition-opacity"
            >
              APPLY FILTERS
            </button>
            <button
              onClick={handleResetFilters}
              className="w-full border border-outline-variant text-on-surface-variant py-2 rounded-lg text-label-caps hover:bg-surface-container-high transition-colors mt-2"
            >
              RESET ALL
            </button>
          </div>
        </div>

        {/* Table + Detail Split */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Data Table */}
          <div className="glass-panel rounded-xl flex-1 flex flex-col overflow-hidden">
            {/* Table Header */}
            <div className="bg-surface-container-high grid grid-cols-[1fr_1.2fr_1fr_1fr_0.8fr_0.8fr_0.5fr] px-4 py-3">
              <span className="text-label-caps text-on-surface-variant">
                PACKET ID
              </span>
              <span className="text-label-caps text-on-surface-variant">
                TIMESTAMP
              </span>
              <span className="text-label-caps text-on-surface-variant">
                ORIGIN
              </span>
              <span className="text-label-caps text-on-surface-variant">
                DESTINATION
              </span>
              <span className="text-label-caps text-on-surface-variant">
                LATENCY
              </span>
              <span className="text-label-caps text-on-surface-variant">
                STATUS
              </span>
              <span className="text-label-caps text-on-surface-variant text-center">
                VIEW
              </span>
            </div>

            {/* Table Body */}
            <div className="overflow-y-auto flex-1">
              {paginatedPackets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                  <span className="material-symbols-outlined text-[36px] text-on-surface-variant">
                    inbox
                  </span>
                  <span className="text-body-sm text-on-surface-variant">
                    No packets match the current filters
                  </span>
                </div>
              ) : (
                paginatedPackets.map((pkt, pageIdx) => {
                  const globalIndex =
                    (currentPage - 1) * ITEMS_PER_PAGE + pageIdx;
                  const realIndex = packets.indexOf(pkt);
                  const isSelected = selectedIndex === globalIndex;
                  const status = STATUS_DISPLAY[pkt.status];
                  const timestamp = pkt.timestamp;

                  return (
                    <div
                      key={globalIndex}
                      onClick={() => handleSelectPacket(pkt, globalIndex)}
                      className={`grid grid-cols-[1fr_1.2fr_1fr_1fr_0.8fr_0.8fr_0.5fr] px-4 py-3 border-b border-border-white cursor-pointer hover:bg-primary/5 transition-colors text-body-sm ${
                        isSelected
                          ? 'bg-primary/5 border-l-2 border-l-primary'
                          : ''
                      }`}
                    >
                      <span className="text-data-mono truncate">
                        {generatePacketId(realIndex >= 0 ? realIndex : globalIndex)}
                      </span>
                      <span className="text-data-mono">
                        {timestamp != null ? formatTimestamp(timestamp) : '--'}
                      </span>
                      <span className="text-on-surface truncate">
                        {pkt.origin_id}
                      </span>
                      <span className="text-on-surface truncate">
                        {pkt.destination_id}
                      </span>
                      <span className="text-data-mono">
                        {pkt.total_latency_ms.toFixed(1)} ms
                      </span>
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full inline-block ${status.dotClass}`}
                        />
                        <span className={`text-body-sm ${status.textClass}`}>
                          {status.label}
                        </span>
                      </span>
                      <span className="flex items-center justify-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVisualizePacket(pkt, globalIndex);
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-primary/10 transition-colors text-primary"
                          title="Visualize Journey"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            rocket_launch
                          </span>
                        </button>
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination */}
            <div className="border-t border-border-white px-4 py-3 flex items-center justify-between">
              <span className="text-label-caps text-on-surface-variant">
                PAGE {currentPage} OF {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage <= 1}
                  className="px-3 py-1 border border-outline-variant rounded-lg text-label-caps text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  PREV
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage >= totalPages}
                  className="px-3 py-1 border border-outline-variant rounded-lg text-label-caps text-on-surface-variant hover:bg-surface-container-high transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  NEXT
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Hop Breakdown */}
          <div className="glass-panel rounded-xl h-64 shrink-0 p-widget-padding">
            {selectedPacket == null ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <span className="material-symbols-outlined text-[36px] text-on-surface-variant">
                  hub
                </span>
                <span className="text-body-sm text-on-surface-variant">
                  Select a packet to view hop details
                </span>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-headline-sm text-on-surface">
                    Detailed Hop Breakdown
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-data-mono text-on-surface-variant">
                      {generatePacketId(
                        selectedIndex != null ? selectedIndex : 0
                      )}
                    </span>
                    <span className="bg-surface-container border border-outline-variant rounded-lg px-2 py-0.5 text-label-caps text-on-surface-variant">
                      {selectedPacket.hop_log.length} hops
                    </span>
                  </div>
                </div>

                {/* Hop Visualization */}
                <div className="flex items-center gap-0 overflow-x-auto mt-4 flex-1">
                  {selectedPacket.hop_log.map((hop, hopIdx) => {
                    const isFirst = hopIdx === 0;
                    const isLast =
                      hopIdx === selectedPacket.hop_log.length - 1;
                    const planet = planetMap.get(hop.planet_id);
                    const planetLabel = planet
                      ? planet.id
                      : hop.planet_id;

                    let roleLabel: string;
                    let roleColor: string;
                    if (isFirst) {
                      roleLabel = 'ORIGIN';
                      roleColor = 'text-primary';
                    } else if (isLast) {
                      roleLabel = 'DESTINATION';
                      roleColor = 'text-secondary';
                    } else {
                      roleLabel = 'RELAY';
                      roleColor = 'text-on-surface-variant';
                    }

                    // Compute the latency to show on the connecting segment
                    const segmentLatency =
                      hop.void_latency_ms != null
                        ? hop.void_latency_ms
                        : hop.fiber_latency_ms + hop.tower_delay_ms;

                    return (
                      <div key={hopIdx} className="flex items-center">
                        {/* Connecting segment before this node (except the first) */}
                        {hopIdx > 0 && (
                          <div className="w-16 flex flex-col items-center relative">
                            <span className="text-data-mono text-xs text-on-surface-variant mb-1">
                              {segmentLatency.toFixed(1)} ms
                            </span>
                            <div className="w-full h-0.5 bg-outline-variant relative">
                              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                            </div>
                          </div>
                        )}

                        {/* Hop Node */}
                        <div className="w-20 h-20 flex flex-col items-center justify-center rounded-xl border border-outline-variant bg-surface-container shrink-0">
                          <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                            public
                          </span>
                          <span
                            className="text-label-caps text-on-surface truncate max-w-[72px] text-center"
                            title={planetLabel}
                          >
                            {planetLabel.length > 8
                              ? planetLabel.slice(0, 8) + '...'
                              : planetLabel}
                          </span>
                          <span className={`text-[10px] ${roleColor}`}>
                            {roleLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {selectedPacket.hop_log.length === 0 && (
                    <span className="text-body-sm text-on-surface-variant">
                      No hops recorded for this packet
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* KPI Card Component                                                  */
/* ================================================================== */

interface KpiCardProps {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  valueColor: string;
}

function KpiCard({ icon, iconColor, label, value, valueColor }: KpiCardProps) {
  return (
    <div className="glass-card hover-glow p-widget-padding">
      <div className="flex items-center gap-2 mb-2">
        <span className={`material-symbols-outlined text-[18px] ${iconColor}`}>
          {icon}
        </span>
        <span className="text-label-caps text-on-surface-variant">{label}</span>
      </div>
      <div className={`text-headline-lg ${valueColor}`}>{value}</div>
    </div>
  );
}
