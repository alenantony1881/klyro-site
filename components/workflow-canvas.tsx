"use client";

import { useAnimationFrame, useInView, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";
import {
  COMPLETE_AT,
  EDGES,
  KIND_ICON,
  LOOP_MS,
  NODE_H,
  NODE_W,
  NODES,
  VIEW_H,
  VIEW_W,
  edgeFillAt,
  edgePath,
  edgeProgressAt,
  nodeStateAt,
  type NodeState,
} from "@/lib/workflow-graph";
import { cn } from "@/lib/utils";

const PATHS = EDGES.map(edgePath);

/**
 * The hero showpiece: a self-running automation graph. A single clock drives
 * everything; node visual state is derived from it and only committed to React
 * state when the derived signature actually changes (~12 renders per 9s loop,
 * not 60/s). Packets and wire fills are written straight to the DOM.
 */
export function WorkflowCanvas({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const inView = useInView(hostRef, { margin: "200px" });
  const reduced = useReducedMotion();

  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const traceRefs = useRef<(SVGPathElement | null)[]>([]);
  const packetRefs = useRef<(SVGGElement | null)[]>([]);
  const lengths = useRef<number[]>([]);
  const elapsed = useRef(0);

  // Reduced motion: render the finished graph, no clock.
  const [states, setStates] = useState<NodeState[]>(() =>
    NODES.map((n) => nodeStateAt(n, reduced ? COMPLETE_AT : 0)),
  );
  const signature = useRef(states.join(""));

  useAnimationFrame((_, delta) => {
    if (reduced || !inView) return;

    elapsed.current = (elapsed.current + delta) % LOOP_MS;
    const t = elapsed.current;

    for (let i = 0; i < EDGES.length; i++) {
      const path = pathRefs.current[i];
      if (!path) continue;

      if (lengths.current[i] === undefined) {
        lengths.current[i] = path.getTotalLength();
      }
      const len = lengths.current[i];

      const trace = traceRefs.current[i];
      if (trace) {
        const fill = edgeFillAt(EDGES[i], t);
        trace.style.strokeDasharray = `${len}`;
        trace.style.strokeDashoffset = `${len * (1 - fill)}`;
      }

      const packet = packetRefs.current[i];
      if (packet) {
        const p = edgeProgressAt(EDGES[i], t);
        if (p < 0) {
          packet.style.opacity = "0";
        } else {
          const pt = path.getPointAtLength(p * len);
          packet.style.opacity = "1";
          packet.setAttribute("transform", `translate(${pt.x} ${pt.y})`);
        }
      }
    }

    const next = NODES.map((n) => nodeStateAt(n, t));
    const sig = next.join("");
    if (sig !== signature.current) {
      signature.current = sig;
      setStates(next);
    }
  });

  const stepList = NODES.map((n) => `${n.label} (${n.sub})`).join(", ");

  return (
    <div
      ref={hostRef}
      className={cn("relative w-full overflow-x-auto pb-1", className)}
    >
      {/* min-width keeps the node labels legible on phones; the panel scrolls
          sideways rather than shrinking the type to nothing. */}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full min-w-[620px]"
        role="img"
        aria-labelledby="wf-title wf-desc"
      >
        <title id="wf-title">Klyro automation workflow</title>
        <desc id="wf-desc">
          An animated diagram of an automated support workflow: {stepList}.
        </desc>

        <defs>
          <linearGradient id="wf-wire" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--accent-light)" stopOpacity="0.9" />
          </linearGradient>
          <filter id="wf-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* wires: dim base + bright trace that fills behind each packet */}
        <g fill="none" strokeLinecap="round">
          {PATHS.map((d, i) => (
            <g key={`edge-${i}`}>
              <path
                ref={(el) => {
                  pathRefs.current[i] = el;
                }}
                d={d}
                stroke="var(--border-strong)"
                strokeWidth={1.5}
              />
              <path
                ref={(el) => {
                  traceRefs.current[i] = el;
                }}
                d={d}
                stroke="url(#wf-wire)"
                strokeWidth={2}
                style={
                  reduced
                    ? undefined
                    : { strokeDasharray: 1, strokeDashoffset: 1 }
                }
              />
            </g>
          ))}
        </g>

        {/* data packets */}
        {!reduced &&
          EDGES.map((_, i) => (
            <g
              key={`packet-${i}`}
              ref={(el) => {
                packetRefs.current[i] = el;
              }}
              style={{ opacity: 0 }}
              filter="url(#wf-glow)"
            >
              <circle r={4.5} fill="var(--lime)" />
              <circle r={9} fill="var(--lime)" opacity={0.18} />
            </g>
          ))}

        {/* nodes */}
        {NODES.map((n, i) => {
          const state = states[i];
          const active = state === "active";
          const done = state === "done";
          const x = n.x - NODE_W / 2;
          const y = n.y - NODE_H / 2;

          return (
            <g key={n.id} style={{ transition: "opacity 300ms" }}>
              {active && (
                <rect
                  x={x - 3}
                  y={y - 3}
                  width={NODE_W + 6}
                  height={NODE_H + 6}
                  rx={13}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  opacity={0.55}
                  filter="url(#wf-glow)"
                />
              )}
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill="var(--surface)"
                stroke={
                  done
                    ? "var(--lime)"
                    : active
                      ? "var(--accent)"
                      : "var(--border-strong)"
                }
                strokeWidth={active || done ? 1.4 : 1}
                style={{ transition: "stroke 300ms" }}
              />

              {/* status glyph */}
              <g transform={`translate(${x + 14} ${y + 12})`}>
                {done ? (
                  <path
                    d="M2 8.5L6 12.5L14 4"
                    fill="none"
                    stroke="var(--lime)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <path
                    d={KIND_ICON[n.kind]}
                    fill="none"
                    stroke={active ? "var(--accent)" : "var(--muted-2)"}
                    strokeWidth={1.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transition: "stroke 300ms" }}
                  />
                )}
              </g>

              <text
                x={x + 38}
                y={y + 23}
                fill="var(--foreground)"
                fontSize={13}
                fontWeight={600}
                className="font-heading"
              >
                {n.label}
              </text>
              <text
                x={x + 38}
                y={y + 39}
                fill="var(--muted-2)"
                fontSize={10.5}
                letterSpacing={0.2}
              >
                {n.sub}
              </text>
            </g>
          );
        })}
      </svg>

      <ol className="sr-only">
        {NODES.map((n) => (
          <li key={n.id}>
            {n.label} — {n.sub}
          </li>
        ))}
      </ol>
    </div>
  );
}
