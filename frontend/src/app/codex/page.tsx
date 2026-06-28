"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { fetchPlanets, translateCodex, type TranslationResult } from "@/lib/api";
import type { PlanetNode } from "@/types";

/* ── Helper: compute base-conversion steps for a single decimal value ── */
interface DivisionStep {
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
}

interface CharConversion {
  char: string;
  decimal: number;
  steps: DivisionStep[];
  remainders: number[];
  result: string;
}

function computeConversionSteps(
  char: string,
  targetBase: number
): CharConversion {
  const decimal = char.charCodeAt(0);
  const steps: DivisionStep[] = [];
  const remainders: number[] = [];
  let dividend = decimal;

  if (dividend === 0) {
    steps.push({ dividend: 0, divisor: targetBase, quotient: 0, remainder: 0 });
    remainders.push(0);
  } else {
    while (dividend > 0) {
      const quotient = Math.floor(dividend / targetBase);
      const remainder = dividend % targetBase;
      steps.push({ dividend, divisor: targetBase, quotient, remainder });
      remainders.push(remainder);
      dividend = quotient;
    }
  }

  const result = remainders.length > 0 ? [...remainders].reverse().join("") : "0";
  return { char, decimal, steps, remainders, result };
}

/* ── Helper: text to binary string ── */
function textToBinary(text: string): string {
  return text
    .split("")
    .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
    .join(" ");
}

/* ── Helper: text to hex string ── */
function textToHex(text: string): string {
  return text
    .split("")
    .map((c) => c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
    .join(" ");
}

/* ── Helper: text to ASCII values ── */
function textToAscii(text: string): string {
  return text
    .split("")
    .map((c) => c.charCodeAt(0))
    .join(", ");
}

/* ── Helper: base name ── */
function baseName(base: number): string {
  switch (base) {
    case 2:
      return "Binary";
    case 8:
      return "Octal";
    case 10:
      return "Decimal";
    case 16:
      return "Hexadecimal";
    default:
      return `Base-${base}`;
  }
}

/* ── Timeline Hop Node ── */
interface HopNodeData {
  label: string;
  sublabel: string;
  active: boolean;
  completed: boolean;
}

/* ════════════════════════════════════════════════════════════════════════
   CODEX TRANSLATOR PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function CodexPage() {
  /* ── State ── */
  const [planets, setPlanets] = useState<PlanetNode[]>([]);
  const [text, setText] = useState("Hello");
  const [targetBase, setTargetBase] = useState(8);
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHop, setActiveHop] = useState(1);
  const [binaryStreamLines, setBinaryStreamLines] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const binaryContainerRef = useRef<HTMLDivElement>(null);
  const [translateTime, setTranslateTime] = useState(0);

  /* ── Fetch planets on mount ── */
  useEffect(() => {
    fetchPlanets()
      .then((p) => {
        setPlanets(p);
        if (p.length > 0 && !p.find((pl) => pl.codex === 8)) {
          setTargetBase(p[0].codex);
        }
      })
      .catch(() => setError("Failed to load planets"));
  }, []);

  /* ── Debounced translation ── */
  const doTranslate = useCallback(
    (t: string, base: number) => {
      if (!t.trim()) return;
      setLoading(true);
      setError(null);
      const start = performance.now();
      translateCodex(t, base)
        .then((res) => {
          setTranslationResult(res);
          setTranslateTime(Math.round(performance.now() - start));
        })
        .catch(() => setError("Translation failed"))
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doTranslate(text, targetBase), 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text, targetBase, doTranslate]);

  /* ── Client-side conversion data ── */
  const conversions: CharConversion[] = text
    .split("")
    .map((c) => computeConversionSteps(c, targetBase));

  /* ── Timeline hops ── */
  const hopPlanets = planets.slice(0, 2);
  const hops: HopNodeData[] = [
    { label: "SOURCE", sublabel: "Earth (Base 10)", active: activeHop === 0, completed: activeHop > 0 },
    {
      label: "HOP 1",
      sublabel: hopPlanets[0]
        ? `${hopPlanets[0].id} (Base ${hopPlanets[0].codex})`
        : `Relay (Base ${targetBase})`,
      active: activeHop === 1,
      completed: activeHop > 1,
    },
    {
      label: "HOP 2",
      sublabel: hopPlanets[1]
        ? `${hopPlanets[1].id} (Base ${hopPlanets[1].codex})`
        : `Gateway (Base ${targetBase})`,
      active: activeHop === 2,
      completed: activeHop > 2,
    },
    {
      label: "DEST",
      sublabel: `Target (${baseName(targetBase)})`,
      active: activeHop === 3,
      completed: false,
    },
  ];

  /* ── Binary stream effect ── */
  const startBinaryStream = useCallback(() => {
    setIsStreaming(true);
    setBinaryStreamLines([]);

    const fullBinary = text
      .split("")
      .map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"))
      .join("");

    let lineIndex = 0;
    const chunkSize = 32;
    const totalLines = Math.ceil(fullBinary.length / chunkSize) + 12;

    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);

    streamIntervalRef.current = setInterval(() => {
      if (lineIndex >= totalLines) {
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        setIsStreaming(false);
        return;
      }

      const start = (lineIndex * chunkSize) % fullBinary.length;
      let line = "";
      for (let i = 0; i < chunkSize; i++) {
        line += fullBinary[(start + i) % fullBinary.length];
      }
      const addr = (lineIndex * chunkSize).toString(16).toUpperCase().padStart(4, "0");
      setBinaryStreamLines((prev) => [...prev.slice(-15), `0x${addr}  ${line}`]);
      lineIndex++;
    }, 80);
  }, [text]);

  useEffect(() => {
    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (binaryContainerRef.current) {
      binaryContainerRef.current.scrollTop =
        binaryContainerRef.current.scrollHeight;
    }
  }, [binaryStreamLines]);

  /* ── Cycle active hop for visual interest ── */
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveHop((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  /* ── Stats ── */
  const activePlanetCount = planets.length;
  const entropyLoss = text.length > 0 ? (2.3 + (text.length % 5) * 0.7).toFixed(1) : "0.0";
  const protocolSymmetry = (97.2 - (targetBase % 7) * 0.3).toFixed(1);

  /* ════════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <div className="p-widget-padding space-y-gutter">
      {/* ── Page Header ── */}
      <div>
        <h1 className="text-headline-lg text-on-surface mb-1">
          Codex Translator
        </h1>
        <p className="text-body-md text-on-surface-variant">
          Step-by-step base conversion viewer for planetary data dialects.
        </p>
      </div>

      {/* ── Translation Hop Timeline ── */}
      <div className="glass-card p-widget-padding hover-glow">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-secondary text-xl">
            timeline
          </span>
          <h2 className="text-label-caps text-on-surface-variant tracking-wider">
            Translation Hop Timeline
          </h2>
          {loading && (
            <span className="ml-auto flex items-center gap-2 text-label-caps text-warning-gold">
              <span className="inline-block w-2 h-2 rounded-full bg-warning-gold animate-pulse" />
              TRANSLATING
            </span>
          )}
        </div>

        <div className="relative flex items-center justify-between px-8">
          {/* Connecting line */}
          <div className="absolute left-12 right-12 top-1/2 -translate-y-1/2 h-px bg-outline-variant z-0" />
          <div
            className="absolute left-12 top-1/2 -translate-y-1/2 h-px bg-primary z-[1] transition-all duration-700"
            style={{ width: `${(activeHop / 3) * 100}%`, maxWidth: "calc(100% - 6rem)" }}
          />

          {hops.map((hop, i) => (
            <button
              key={i}
              onClick={() => setActiveHop(i)}
              className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer"
            >
              <div
                className={`
                  w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300
                  ${hop.active
                    ? "border-primary bg-primary/20 shadow-[0_0_16px_rgba(197,192,255,0.4)]"
                    : hop.completed
                      ? "border-success-green bg-success-green/10"
                      : "border-outline-variant bg-surface-container"
                  }
                `}
              >
                {hop.completed ? (
                  <span className="material-symbols-outlined text-success-green text-base">
                    check
                  </span>
                ) : (
                  <span
                    className={`text-data-mono text-xs ${hop.active ? "text-primary" : "text-on-surface-variant"}`}
                  >
                    {i + 1}
                  </span>
                )}
              </div>
              <div className="text-center">
                <div
                  className={`text-label-caps text-[10px] ${hop.active ? "text-primary" : "text-on-surface-variant"}`}
                >
                  {hop.label}
                </div>
                <div className="text-[10px] text-on-surface-variant/60 mt-0.5 whitespace-nowrap">
                  {hop.sublabel}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="glass-card border-danger-red/30 p-compact-padding flex items-center gap-3">
          <span className="material-symbols-outlined text-danger-red">error</span>
          <span className="text-body-sm text-danger-red">{error}</span>
          <button
            onClick={() => { setError(null); doTranslate(text, targetBase); }}
            className="ml-auto text-label-caps text-primary hover:text-primary/80 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Three-Panel Layout ── */}
      <div className="grid grid-cols-12 gap-gutter min-h-[600px]">
        {/* ─── Panel 1: Original Message ─── */}
        <div className="col-span-3 glass-card p-widget-padding hover-glow flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-tertiary text-xl">
              edit_note
            </span>
            <h2 className="text-label-caps text-on-surface-variant">
              Original Message
            </h2>
          </div>

          {/* Text Input */}
          <div className="mb-4">
            <label className="text-label-caps text-on-surface-variant/60 block mb-1.5">
              Input Text
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-data-mono text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 resize-none transition-colors"
              placeholder="Enter text..."
            />
          </div>

          {/* Target Base Dropdown */}
          <div className="mb-5">
            <label className="text-label-caps text-on-surface-variant/60 block mb-1.5">
              Target Base
            </label>
            <select
              value={targetBase}
              onChange={(e) => setTargetBase(Number(e.target.value))}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2.5 text-data-mono text-on-surface focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 appearance-none cursor-pointer transition-colors"
            >
              <option value={2}>Base 2 -- Binary</option>
              <option value={8}>Base 8 -- Octal</option>
              <option value={16}>Base 16 -- Hexadecimal</option>
              {planets
                .filter((p) => ![2, 8, 16].includes(p.codex))
                .map((p) => (
                  <option key={p.id} value={p.codex}>
                    Base {p.codex} -- {p.id}
                  </option>
                ))}
            </select>
          </div>

          {/* Plaintext Display */}
          <div className="border border-outline-variant/50 rounded-lg p-compact-padding mb-3">
            <div className="text-label-caps text-on-surface-variant/60 text-[10px] mb-2">
              PLAINTEXT
            </div>
            <div className="text-display-lg text-on-surface break-all">
              {text || " "}
            </div>
          </div>

          {/* Representations */}
          <div className="flex-1 space-y-3 overflow-y-auto">
            {[
              { label: "ASCII_VALUES", value: textToAscii(text) },
              { label: "HEX_VALUES", value: textToHex(text) },
              { label: "BINARY_BYTES", value: textToBinary(text) },
            ].map((repr) => (
              <div
                key={repr.label}
                className="border border-outline-variant/50 rounded-lg p-compact-padding"
              >
                <div className="text-label-caps text-on-surface-variant/60 text-[10px] mb-1.5">
                  {repr.label}
                </div>
                <div className="text-data-mono text-on-surface text-xs break-all leading-relaxed">
                  {repr.value || " "}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Panel 2: Codex Conversion Logic ─── */}
        <div className="col-span-6 glass-card p-widget-padding hover-glow flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">
                function
              </span>
              <h2 className="text-label-caps text-on-surface-variant">
                Planetary_Codex_Logic
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${loading ? "bg-warning-gold animate-pulse" : "bg-success-green"}`}
              />
              <span className="text-label-caps text-[10px] text-on-surface-variant/60">
                {loading ? "PROCESSING" : "ACTIVE"}
              </span>
            </div>
          </div>

          <div className="text-data-mono text-xs text-on-surface-variant/80 mb-5">
            Earth Dec (Base 10) &rarr; Target ({baseName(targetBase)}, Base{" "}
            {targetBase})
          </div>

          {/* Step-by-step conversion visualization */}
          <div className="mb-5 overflow-x-auto">
            <div className="flex gap-4 pb-2">
              {conversions.slice(0, 8).map((conv, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 shrink-0"
                >
                  {/* Decimal box */}
                  <div className="flex flex-col items-center">
                    <div className="text-label-caps text-[9px] text-on-surface-variant/50 mb-1">
                      &apos;{conv.char}&apos;
                    </div>
                    <div className="w-12 h-10 border border-secondary/40 rounded flex items-center justify-center bg-surface-container-lowest">
                      <span className="text-data-mono text-secondary text-sm">
                        {conv.decimal}
                      </span>
                    </div>
                  </div>

                  {/* Arrow with formula */}
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="text-[9px] text-on-surface-variant/50 text-data-mono">
                      &divide;{targetBase}
                    </div>
                    <span className="material-symbols-outlined text-primary/60 text-sm">
                      arrow_forward
                    </span>
                  </div>

                  {/* Result box */}
                  <div className="flex flex-col items-center">
                    <div className="text-label-caps text-[9px] text-on-surface-variant/50 mb-1">
                      BASE {targetBase}
                    </div>
                    <div className="w-14 h-10 border border-primary/40 rounded flex items-center justify-center bg-primary/5">
                      <span className="text-data-mono text-primary text-sm font-semibold">
                        {conv.result}
                      </span>
                    </div>
                  </div>

                  {/* Separator */}
                  {idx < Math.min(conversions.length, 8) - 1 && (
                    <div className="w-px h-8 bg-outline-variant/30 mx-1" />
                  )}
                </div>
              ))}
              {conversions.length > 8 && (
                <div className="flex items-center text-on-surface-variant/50 text-data-mono text-xs">
                  +{conversions.length - 8} more
                </div>
              )}
            </div>
          </div>

          {/* MODE Badge */}
          <div className="flex items-center justify-center my-4">
            <div className="w-20 h-20 rounded-full border-2 border-primary/40 bg-primary/10 flex flex-col items-center justify-center shadow-[0_0_24px_rgba(197,192,255,0.15)]">
              <span className="text-label-caps text-on-surface-variant/60 text-[9px]">MODE</span>
              <span className="text-headline-sm text-primary font-bold">B{targetBase}</span>
            </div>
          </div>

          {/* Conversion Table */}
          <div className="flex-1 overflow-y-auto border border-outline-variant/30 rounded-lg">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-surface-container z-10">
                <tr className="border-b border-outline-variant/30">
                  {["CHAR", "DEC", "LOGIC", "REM", "RESULT"].map((col) => (
                    <th
                      key={col}
                      className="text-label-caps text-[10px] text-on-surface-variant/60 p-compact-padding font-normal"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {conversions.map((conv, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-outline-variant/15 hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="p-compact-padding">
                      <span className="text-data-mono text-tertiary">
                        &apos;{conv.char}&apos;
                      </span>
                    </td>
                    <td className="p-compact-padding">
                      <span className="text-data-mono text-secondary">
                        {conv.decimal}
                      </span>
                    </td>
                    <td className="p-compact-padding">
                      <div className="flex flex-wrap gap-1">
                        {conv.steps.map((step, si) => (
                          <span
                            key={si}
                            className="text-data-mono text-[11px] text-on-surface-variant/70"
                          >
                            {step.dividend}&divide;{step.divisor}={step.quotient}
                            {si < conv.steps.length - 1 && (
                              <span className="text-outline-variant mx-0.5">&middot;</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-compact-padding">
                      <span className="text-data-mono text-[11px] text-warning-gold">
                        [{conv.remainders.join(", ")}]
                      </span>
                    </td>
                    <td className="p-compact-padding">
                      <span className="text-data-mono text-primary font-semibold">
                        {conv.result}
                      </span>
                      {translationResult &&
                        translationResult.encoded_payload?.[idx] && (
                          <span className="text-[10px] text-on-surface-variant/40 ml-1">
                            (API: {translationResult.encoded_payload[idx]})
                          </span>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {conversions.length === 0 && (
              <div className="flex items-center justify-center h-32 text-on-surface-variant/40 text-body-sm">
                Enter text to see conversion
              </div>
            )}
          </div>
        </div>

        {/* ─── Panel 3: Binary Stream ─── */}
        <div className="col-span-3 glass-card p-widget-padding hover-glow flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-success-green text-xl">
              stream
            </span>
            <h2 className="text-label-caps text-on-surface-variant">
              Binary Stream
            </h2>
          </div>

          {/* Protocol Frame */}
          <div className="border border-outline-variant/40 rounded-lg p-compact-padding mb-4 space-y-2">
            <div className="text-label-caps text-[10px] text-on-surface-variant/50 mb-2">
              Protocol Frame
            </div>
            {[
              { label: "HEADER", value: "0xRR26", color: "text-primary" },
              { label: "SRC_ADDR", value: "0x0A:EARTH", color: "text-secondary" },
              {
                label: "DST_ADDR",
                value: planets[0]
                  ? `0x${planets[0].codex.toString(16).toUpperCase()}:${planets[0].id}`
                  : `0x${targetBase.toString(16).toUpperCase()}:TARGET`,
                color: "text-tertiary",
              },
              {
                label: "FLAGS",
                value: isStreaming ? "TX_ACTIVE | ENCODE" : "IDLE | STANDBY",
                color: isStreaming ? "text-warning-gold" : "text-on-surface-variant/60",
              },
            ].map((field) => (
              <div key={field.label} className="flex items-center justify-between">
                <span className="text-label-caps text-[9px] text-on-surface-variant/50">
                  {field.label}
                </span>
                <span className={`text-data-mono text-[11px] ${field.color}`}>
                  {field.value}
                </span>
              </div>
            ))}
          </div>

          {/* Binary Live Stream */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="text-label-caps text-[10px] text-on-surface-variant/50 mb-2">
              Live Binary Output
            </div>
            <div
              ref={binaryContainerRef}
              className="flex-1 bg-surface-container-lowest rounded-lg p-3 overflow-y-auto min-h-[200px] border border-outline-variant/20"
            >
              {binaryStreamLines.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <span className="text-data-mono text-xs text-on-surface-variant/30">
                    Awaiting broadcast...
                  </span>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {binaryStreamLines.map((line, i) => (
                    <div
                      key={i}
                      className="text-data-mono text-[11px] leading-relaxed"
                      style={{
                        color: "#00D084",
                        textShadow: "0 0 6px rgba(0, 208, 132, 0.4)",
                        opacity:
                          i === binaryStreamLines.length - 1
                            ? 1
                            : 0.5 + (i / binaryStreamLines.length) * 0.5,
                      }}
                    >
                      {line}
                      {i === binaryStreamLines.length - 1 && isStreaming && (
                        <span className="inline-block w-1.5 h-3.5 bg-success-green ml-1 animate-pulse align-middle" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={startBinaryStream}
              disabled={isStreaming || !text.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-primary/15 border border-primary/30 text-primary rounded-lg px-4 py-2.5 text-label-caps text-[11px] hover:bg-primary/25 hover:border-primary/50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">
                cell_tower
              </span>
              Broadcast_Packet
            </button>
            <button
              onClick={() => {
                setBinaryStreamLines([]);
                setIsStreaming(false);
                if (streamIntervalRef.current)
                  clearInterval(streamIntervalRef.current);
              }}
              className="flex items-center justify-center gap-1 border border-outline-variant/50 text-on-surface-variant rounded-lg px-3 py-2.5 text-label-caps text-[11px] hover:border-on-surface-variant/50 hover:text-on-surface transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">
                refresh
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer Stats ── */}
      <div className="grid grid-cols-4 gap-gutter">
        {[
          {
            label: "TRANSLATION_COMPUTE",
            value: `${translateTime}ms`,
            icon: "speed",
            color: "text-primary",
          },
          {
            label: "ENTROPY_LOSS",
            value: `${entropyLoss}%`,
            icon: "trending_down",
            color: "text-warning-gold",
          },
          {
            label: "NODES_ACTIVE",
            value: `${activePlanetCount}`,
            icon: "hub",
            color: "text-success-green",
          },
          {
            label: "PROTOCOL_SYMMETRY",
            value: `${protocolSymmetry}%`,
            icon: "balance",
            color: "text-secondary",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card border border-outline-variant/30 p-widget-padding hover-glow"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-label-caps text-[10px] text-on-surface-variant/60">
                {stat.label}
              </span>
              <span
                className={`material-symbols-outlined text-lg ${stat.color}`}
              >
                {stat.icon}
              </span>
            </div>
            <div className={`text-headline-sm ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
