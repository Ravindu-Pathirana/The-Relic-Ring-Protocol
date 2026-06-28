import type {
  UniverseConfig,
  PlanetNode,
  Packet,
  Route,
  NetworkState,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Universe
export function fetchUniverse(): Promise<UniverseConfig> {
  return request('/universe');
}

export function fetchPlanets(): Promise<PlanetNode[]> {
  return request('/universe/planets');
}

export function fetchPlanetById(id: string): Promise<PlanetNode> {
  return request(`/universe/planets/${encodeURIComponent(id)}`);
}

// Packets
export function sendPacket(
  origin: string,
  destination: string,
  payload: string
): Promise<Packet> {
  return request('/packets/send', {
    method: 'POST',
    body: JSON.stringify({ origin_id: origin, destination_id: destination, payload }),
  });
}

export function fetchPacketHistory(): Promise<Packet[]> {
  return request('/packets/history');
}

// Routing
export function fetchRoute(from: string, to: string): Promise<Route> {
  return request(
    `/routing/route?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  );
}

// Codex
export interface TranslationStep {
  character: string;
  ascii_value: number;
  target_base: number;
  division_steps: { dividend: number; divisor: number; quotient: number; remainder: number }[];
  result: string;
}

export interface TranslationResult {
  original_text: string;
  target_base: number;
  steps: TranslationStep[];
  encoded_payload: string[];
  binary_stream: string;
}

export function translateCodex(
  text: string,
  targetBase: number
): Promise<TranslationResult> {
  return request('/codex/translate', {
    method: 'POST',
    body: JSON.stringify({ text, target_base: targetBase }),
  });
}

// Network
export function fetchNetworkStatus(): Promise<NetworkState> {
  return request('/network/status');
}

export function disableNode(id: string): Promise<{ success: boolean; state: NetworkState }> {
  return request('/network/disable-node', {
    method: 'POST',
    body: JSON.stringify({ planet_id: id }),
  });
}

export function enableNode(id: string): Promise<{ success: boolean; state: NetworkState }> {
  return request('/network/enable-node', {
    method: 'POST',
    body: JSON.stringify({ planet_id: id }),
  });
}

export function disableLink(from: string, to: string): Promise<NetworkState> {
  return request('/network/disable-link', {
    method: 'POST',
    body: JSON.stringify({ from, to }),
  });
}

export function enableLink(from: string, to: string): Promise<NetworkState> {
  return request('/network/enable-link', {
    method: 'POST',
    body: JSON.stringify({ from, to }),
  });
}
