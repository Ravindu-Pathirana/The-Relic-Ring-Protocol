export interface HopLogEntry {
  planet_id: string;
  tower_entry: number;
  tower_exit: number;
  codex_base: number;
  payload_in_codex: string[];
  fiber_latency_ms: number;
  tower_delay_ms: number;
  void_latency_ms: number | null;
  atmospheric_delay_ms: number | null;
  timestamp: number;
}

export type PacketStatus = 'pending' | 'in_transit' | 'delivered' | 'undeliverable';

export interface Packet {
  origin_id: string;
  destination_id: string;
  current_id: string;
  payload: string;
  payload_ascii: number[];
  hop_log: HopLogEntry[];
  status: PacketStatus;
  total_latency_ms: number;
}
