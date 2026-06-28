'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  fetchPlanets,
  fetchNetworkStatus,
  disableNode,
  enableNode,
} from '@/lib/api';
import type { PlanetNode, NetworkState } from '@/types';

// ─── Local Types ───

interface EventLogEntry {
  timestamp: Date;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'CRITICAL';
  message: string;
}

// ─── Helpers ───

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getLevelColor(level: EventLogEntry['level']): string {
  switch (level) {
    case 'CRITICAL':
      return 'text-danger-red';
    case 'WARN':
      return 'text-warning-gold';
    case 'SUCCESS':
      return 'text-success-green';
    case 'INFO':
      return 'text-primary';
  }
}

// ─── Page Component ───

export default function NetworkPage() {
  const [planets, setPlanets] = useState<PlanetNode[]>([]);
  const [networkState, setNetworkState] = useState<NetworkState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [showNodeFailureModal, setShowNodeFailureModal] = useState(false);
  const [autoRecovery, setAutoRecovery] = useState(false);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);

  const logEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ─── Log helper ───

  const addLog = useCallback(
    (level: EventLogEntry['level'], message: string) => {
      setEventLog((prev) => [
        ...prev,
        { timestamp: new Date(), level, message },
      ]);
    },
    [],
  );

  // ─── Initial data fetch ───

  useEffect(() => {
    async function loadData() {
      try {
        const [planetsData, statusData] = await Promise.all([
          fetchPlanets(),
          fetchNetworkStatus(),
        ]);
        setPlanets(planetsData);
        setNetworkState(statusData);
        setLoading(false);
        addLog('INFO', 'System initialized. Network topology loaded.');
        const onlineCount = planetsData.length - (statusData.disabled_nodes?.length ?? 0);
        addLog(
          'INFO',
          `${onlineCount} nodes online. Monitoring active.`,
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load network data',
        );
        setLoading(false);
      }
    }
    loadData();
  }, [addLog]);

  // ─── Auto-scroll log ───

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [eventLog]);

  // ─── Close modal on outside click ───

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(e.target as Node)
      ) {
        setShowNodeFailureModal(false);
      }
    }
    if (showNodeFailureModal) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNodeFailureModal]);

  // ─── Chaos actions ───

  async function handleDisableNode(id: string) {
    try {
      addLog('CRITICAL', `Initiating node failure on ${id}...`);
      const result = await disableNode(id);
      setNetworkState(result.state);
      setShowNodeFailureModal(false);
      addLog('WARN', `Node ${id} has been taken offline.`);
    } catch (err) {
      addLog(
        'CRITICAL',
        `Failed to disable node ${id}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  async function handleEnableNode(id: string) {
    try {
      addLog('INFO', `Initiating reboot sequence for ${id}...`);
      const result = await enableNode(id);
      setNetworkState(result.state);
      addLog('SUCCESS', `Node ${id} successfully rebooted and online.`);
    } catch (err) {
      addLog(
        'CRITICAL',
        `Failed to reboot node ${id}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  }

  // ─── SVG coordinate mapping ───

  const svgPositions = useMemo(() => {
    if (planets.length === 0) return new Map<string, { x: number; y: number }>();

    const xs = planets.map((p) => p.x);
    const ys = planets.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    const map = new Map<string, { x: number; y: number }>();
    for (const p of planets) {
      map.set(p.id, {
        x: 100 + ((p.x - minX) / rangeX) * 600,
        y: 50 + ((p.y - minY) / rangeY) * 500,
      });
    }
    return map;
  }, [planets]);

  // ─── Derive node statuses ───

  const isNodeDisabled = useCallback(
    (id: string): boolean => {
      return networkState?.disabled_nodes.includes(id) ?? false;
    },
    [networkState],
  );

  const isLinkDisabled = useCallback(
    (fromId: string, toId: string): boolean => {
      return (
        networkState?.disabled_links.some(
          ([a, b]) =>
            (a === fromId && b === toId) || (a === toId && b === fromId),
        ) ?? false
      );
    },
    [networkState],
  );

  const nodeHasDisabledLinks = useCallback(
    (id: string): boolean => {
      return (
        networkState?.disabled_links.some(
          ([a, b]) => a === id || b === id,
        ) ?? false
      );
    },
    [networkState],
  );

  type NodeStatus = 'healthy' | 'warning' | 'disabled';

  const getNodeStatus = useCallback(
    (id: string): NodeStatus => {
      if (isNodeDisabled(id)) return 'disabled';
      if (nodeHasDisabledLinks(id)) return 'warning';
      return 'healthy';
    },
    [isNodeDisabled, nodeHasDisabledLinks],
  );

  const statusColors: Record<NodeStatus, { stroke: string; fill: string }> = {
    healthy: { stroke: '#c5c0ff', fill: '#00D084' },
    warning: { stroke: '#FFB020', fill: '#FFB020' },
    disabled: { stroke: '#F04438', fill: '#F04438' },
  };

  // ─── Stable mock metrics per node ───

  const nodeMetrics = useMemo(() => {
    const metrics = new Map<string, { latency: string; load: number }>();
    for (const p of planets) {
      // Deterministic pseudo-random from codex value
      const seed = p.codex * 7 + p.x * 3 + p.y * 11;
      const latency = (5 + (seed % 200) / 10).toFixed(1);
      const load = 20 + (seed % 60);
      metrics.set(p.id, { latency, load });
    }
    return metrics;
  }, [planets]);

  // ─── Link pairs (all pairs) ───

  const linkPairs = useMemo(() => {
    const pairs: { from: PlanetNode; to: PlanetNode }[] = [];
    for (let i = 0; i < planets.length; i++) {
      for (let j = i + 1; j < planets.length; j++) {
        pairs.push({ from: planets[i], to: planets[j] });
      }
    }
    return pairs;
  }, [planets]);

  // ─── Render ───

  if (loading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <span className="text-data-mono text-on-surface-variant animate-pulse">
          Loading network topology...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="glass-panel rounded-xl p-widget-padding text-center">
          <span className="material-symbols-outlined text-danger-red text-4xl mb-2">
            error
          </span>
          <p className="text-body-md text-danger-red">{error}</p>
        </div>
      </div>
    );
  }

  const disabledNodes = networkState?.disabled_nodes ?? [];
  const activeNodes = planets.filter(p => !disabledNodes.includes(p.id)).map(p => p.id);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-widget-padding overflow-hidden gap-3">
      {/* ─── Top Status Bar ─── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success-green animate-pulse" />
          <span className="text-label-caps text-success-green">CORE SYSTEM NOMINAL</span>
        </div>
        <span className="text-label-caps text-on-surface-variant">ENCRYPTION: QUANTUM-AES-512</span>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
      {/* ─── Left: Network Map ─── */}
      <div className="flex-1 glass-panel rounded-xl relative overflow-hidden">
        {/* Scanning line animation — sweeps vertically */}
        <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-secondary to-transparent animate-scanning-line pointer-events-none z-10" />

        {/* Top overlay stats */}
        <div className="absolute top-4 left-4 right-4 glass-panel rounded-lg px-4 py-2 flex items-center justify-between z-10">
          <span className="text-label-caps text-on-surface-variant">
            NETWORK TOPOLOGY: ORION SECTOR B-12
          </span>
          <div className="flex gap-6">
            <span className="text-data-mono text-on-surface text-xs">
              TOTAL NODES: <span className="text-success-green">{planets.length} ACTIVE</span>
            </span>
            <span className="text-data-mono text-on-surface-variant text-xs">
              AVG LATENCY: <span className="text-secondary">14.2ms</span>
            </span>
          </div>
        </div>

        {/* SVG Network Graph */}
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 800 600"
          className="p-8"
        >
          {/* Links */}
          {linkPairs.map(({ from, to }) => {
            const posFrom = svgPositions.get(from.id);
            const posTo = svgPositions.get(to.id);
            if (!posFrom || !posTo) return null;

            const fromDisabled = isNodeDisabled(from.id);
            const toDisabled = isNodeDisabled(to.id);
            const linkOff = isLinkDisabled(from.id, to.id);
            const eitherNodeDisabled = fromDisabled || toDisabled;

            let strokeColor = '#00D084';
            let strokeWidth = 1.5;
            let opacity = 0.6;
            let dashArray: string | undefined;

            if (linkOff) {
              strokeColor = '#F04438';
              strokeWidth = 1;
              dashArray = '6 4';
              opacity = 0.5;
            } else if (eitherNodeDisabled) {
              strokeColor = '#FFB020';
              strokeWidth = 1;
              opacity = 0.4;
            }

            return (
              <line
                key={`link-${from.id}-${to.id}`}
                x1={posFrom.x}
                y1={posFrom.y}
                x2={posTo.x}
                y2={posTo.y}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                opacity={opacity}
                strokeDasharray={dashArray}
              />
            );
          })}

          {/* Planet nodes */}
          {planets.map((planet) => {
            const pos = svgPositions.get(planet.id);
            if (!pos) return null;

            const status = getNodeStatus(planet.id);
            const colors = statusColors[status];
            const isSelected = selectedNode === planet.id;

            return (
              <g
                key={`node-${planet.id}`}
                className="cursor-pointer"
                onClick={() => setSelectedNode(planet.id)}
              >
                {/* Selection glow */}
                {isSelected && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={26}
                    fill="transparent"
                    stroke={colors.stroke}
                    strokeWidth={1.5}
                    opacity={0.3}
                  />
                )}

                {/* Outer circle */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={18}
                  fill="transparent"
                  stroke={colors.stroke}
                  strokeWidth={2}
                  strokeDasharray={
                    status === 'disabled' ? '4 3' : undefined
                  }
                />

                {/* Status dot at top-right */}
                <circle
                  cx={pos.x + 12}
                  cy={pos.y - 12}
                  r={4}
                  fill={colors.fill}
                />

                {/* Label */}
                <text
                  x={pos.x}
                  y={pos.y + 32}
                  fill="#dfe1f6"
                  fontSize={10}
                  textAnchor="middle"
                  opacity={status === 'disabled' ? 0.5 : 1}
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {planet.id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex gap-6 z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success-green" />
            <span className="text-label-caps text-on-surface-variant text-xs">
              HEALTHY
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-warning-gold" />
            <span className="text-label-caps text-on-surface-variant text-xs">
              JITTER
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-danger-red" />
            <span className="text-label-caps text-on-surface-variant text-xs">
              OFFLINE
            </span>
          </div>
        </div>
      </div>

      {/* ─── Right: Chaos Command Center ─── */}
      <div className="w-[400px] shrink-0 flex flex-col gap-4">
        {/* Chaos Engine */}
        <div className="glass-panel rounded-xl p-widget-padding">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-warning-gold">
              warning
            </span>
            <span className="text-label-caps text-on-surface">
              CHAOS ENGINE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            {/* Solar Storm */}
            <button className="bg-surface-container hover:bg-warning-gold/10 border border-outline-variant hover:border-warning-gold/50 rounded-xl p-compact-padding flex flex-col items-center gap-2 cursor-pointer transition-colors micro-glow-warning">
              <span className="material-symbols-outlined text-warning-gold">
                bolt
              </span>
              <span className="text-label-caps text-warning-gold text-xs">
                SOLAR STORM
              </span>
            </button>

            {/* Fiber Cut */}
            <button className="bg-surface-container hover:bg-danger-red/10 border border-outline-variant hover:border-danger-red/50 rounded-xl p-compact-padding flex flex-col items-center gap-2 cursor-pointer transition-colors micro-glow-danger">
              <span className="material-symbols-outlined text-danger-red">
                leak_remove
              </span>
              <span className="text-label-caps text-danger-red text-xs">
                FIBER CUT
              </span>
            </button>

            {/* Node Failure */}
            <div className="relative">
              <button
                onClick={() =>
                  setShowNodeFailureModal((prev) => !prev)
                }
                className="w-full bg-surface-container hover:bg-danger-red/10 border border-outline-variant hover:border-danger-red/50 rounded-xl p-compact-padding flex flex-col items-center gap-2 cursor-pointer transition-colors micro-glow-danger"
              >
                <span className="material-symbols-outlined text-danger-red">
                  power_off
                </span>
                <span className="text-label-caps text-danger-red text-xs">
                  NODE FAILURE
                </span>
              </button>

              {/* Node Failure Dropdown */}
              {showNodeFailureModal && (
                <div
                  ref={modalRef}
                  className="absolute top-full left-0 mt-2 w-56 glass-panel rounded-xl p-3 z-50 max-h-60 overflow-y-auto"
                >
                  <span className="text-label-caps text-on-surface-variant text-xs block mb-2">
                    SELECT NODE TO DISABLE
                  </span>
                  {activeNodes.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant py-2">
                      No active nodes available.
                    </p>
                  ) : (
                    activeNodes.map((nodeId) => (
                      <button
                        key={nodeId}
                        onClick={() => handleDisableNode(nodeId)}
                        className="w-full flex items-center gap-2 p-2 hover:bg-surface-container-high rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full bg-success-green" />
                        <span className="text-body-sm text-on-surface">
                          {nodeId}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Distortion */}
            <button className="bg-surface-container hover:bg-danger-red/10 border border-outline-variant hover:border-danger-red/50 rounded-xl p-compact-padding flex flex-col items-center gap-2 cursor-pointer transition-colors micro-glow-danger">
              <span className="material-symbols-outlined text-secondary">
                cloud_off
              </span>
              <span className="text-label-caps text-secondary text-xs">
                DISTORTION
              </span>
            </button>
          </div>

          {/* Auto Recovery Toggle */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-label-caps text-on-surface-variant text-xs">
              AUTO RECOVERY
            </span>
            <button
              onClick={() => setAutoRecovery((prev) => !prev)}
              className={`w-10 h-5 rounded-full relative transition-colors ${
                autoRecovery
                  ? 'bg-success-green'
                  : 'bg-surface-container-high'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-on-surface transition-transform ${
                  autoRecovery ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Node Registry */}
        <div className="glass-panel rounded-xl p-widget-padding flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-label-caps text-on-surface">
              NODE REGISTRY
            </span>
            <span className="material-symbols-outlined text-on-surface-variant">
              hub
            </span>
          </div>

          <div className="flex-1 overflow-y-auto mt-3 space-y-2">
            {planets.map((planet) => {
              const disabled = isNodeDisabled(planet.id);
              return (
                <div
                  key={planet.id}
                  className="flex items-center gap-3 p-compact-padding rounded-lg border border-border-white hover:border-outline-variant transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      disabled ? 'bg-danger-red' : 'bg-success-green'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-body-sm text-on-surface block">
                      {planet.id}
                    </span>
                    <span className="text-data-mono text-on-surface-variant text-[10px]">
                      {disabled ? 'OFFLINE' : `${nodeMetrics.get(planet.id)?.latency ?? '0'}ms / ${nodeMetrics.get(planet.id)?.load ?? 0}% load`}
                    </span>
                  </div>
                  {disabled && (
                    <button
                      onClick={() => handleEnableNode(planet.id)}
                      className="px-3 py-1 bg-danger-red/20 text-danger-red text-label-caps text-xs rounded-lg hover:bg-danger-red/30 transition-colors"
                    >
                      FORCE REBOOT
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* System Event Log */}
        <div className="glass-panel rounded-xl p-widget-padding h-48 shrink-0 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-success-green text-base">
              terminal
            </span>
            <span className="text-label-caps text-on-surface">
              SYSTEM EVENT LOG
            </span>
          </div>

          <div className="flex-1 overflow-y-auto bg-black/40 rounded-lg p-3 font-mono text-xs space-y-0.5">
            {eventLog.map((entry, i) => (
              <div key={i} className="flex gap-2 py-0.5">
                <span className="text-success-green/60 shrink-0">
                  [{formatTime(entry.timestamp)}]
                </span>
                <span className={`shrink-0 font-bold ${getLevelColor(entry.level)}`}>
                  [{entry.level}]
                </span>
                <span className="text-success-green/90">{entry.message}</span>
              </div>
            ))}
            <div className="flex items-center gap-1">
              <span className="text-success-green/60">{'>'}</span>
              <span className="w-2 h-3.5 bg-success-green/80 animate-pulse" />
            </div>
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
