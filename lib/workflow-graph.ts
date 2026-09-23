export type NodeId =
  | "trigger"
  | "classify"
  | "enrich"
  | "sentiment"
  | "decide"
  | "output";

export type NodeKind = "trigger" | "ai" | "action" | "output";
export type NodeState = "idle" | "active" | "done";

export interface WFNode {
  id: NodeId;
  label: string;
  sub: string;
  kind: NodeKind;
  /** Centre point in viewBox user space. */
  x: number;
  y: number;
  /** ms at which this node starts processing / finishes. */
  activeAt: number;
  doneAt: number;
}

export interface WFEdge {
  from: NodeId;
  to: NodeId;
  /** ms window during which a data packet travels this edge. */
  startAt: number;
  endAt: number;
}

export const VIEW_W = 860;
export const VIEW_H = 280;
export const NODE_W = 130;
export const NODE_H = 54;

export const LOOP_MS = 9000;
/** Everything has completed by here; the graph holds, then resets. */
export const RESET_AT = 8400;
export const COMPLETE_AT = 6400;

export const NODES: WFNode[] = [
  {
    id: "trigger",
    label: "Ticket in",
    sub: "Helpdesk",
    kind: "trigger",
    x: 75,
    y: 140,
    activeAt: 200,
    doneAt: 800,
  },
  {
    id: "classify",
    label: "Classify",
    sub: "AI agent",
    kind: "ai",
    x: 245,
    y: 140,
    activeAt: 1400,
    doneAt: 2200,
  },
  {
    id: "enrich",
    label: "Enrich",
    sub: "CRM lookup",
    kind: "action",
    x: 415,
    y: 72,
    activeAt: 2800,
    doneAt: 3600,
  },
  {
    id: "sentiment",
    label: "Sentiment",
    sub: "AI agent",
    kind: "ai",
    x: 415,
    y: 208,
    activeAt: 2800,
    doneAt: 3600,
  },
  {
    id: "decide",
    label: "Route",
    sub: "Rules + AI",
    kind: "ai",
    x: 585,
    y: 140,
    activeAt: 4200,
    doneAt: 5000,
  },
  {
    id: "output",
    label: "Resolved",
    sub: "Reply sent",
    kind: "output",
    x: 755,
    y: 140,
    activeAt: 5600,
    doneAt: 6400,
  },
];

export const EDGES: WFEdge[] = [
  { from: "trigger", to: "classify", startAt: 800, endAt: 1400 },
  { from: "classify", to: "enrich", startAt: 2200, endAt: 2800 },
  { from: "classify", to: "sentiment", startAt: 2200, endAt: 2800 },
  { from: "enrich", to: "decide", startAt: 3600, endAt: 4200 },
  { from: "sentiment", to: "decide", startAt: 3600, endAt: 4200 },
  { from: "decide", to: "output", startAt: 5000, endAt: 5600 },
];

const byId = new Map(NODES.map((n) => [n.id, n]));

/** Cubic bezier from the right edge of `from` to the left edge of `to`. */
export function edgePath(edge: WFEdge): string {
  const a = byId.get(edge.from)!;
  const b = byId.get(edge.to)!;
  const x1 = a.x + NODE_W / 2;
  const y1 = a.y;
  const x2 = b.x - NODE_W / 2;
  const y2 = b.y;
  const dx = (x2 - x1) * 0.55;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export function nodeStateAt(node: WFNode, t: number): NodeState {
  if (t >= RESET_AT) return "idle";
  if (t < node.activeAt) return "idle";
  if (t < node.doneAt) return "active";
  return "done";
}

/** 0 → 1 packet position along the edge; -1 when no packet is in flight. */
export function edgeProgressAt(edge: WFEdge, t: number): number {
  if (t >= RESET_AT) return -1;
  if (t < edge.startAt || t > edge.endAt) return -1;
  return (t - edge.startAt) / (edge.endAt - edge.startAt);
}

/** 0 → 1 fill of the wire itself, which stays filled once the packet has passed. */
export function edgeFillAt(edge: WFEdge, t: number): number {
  if (t >= RESET_AT) return 0;
  if (t <= edge.startAt) return 0;
  if (t >= edge.endAt) return 1;
  return (t - edge.startAt) / (edge.endAt - edge.startAt);
}

export const KIND_LABEL: Record<NodeKind, string> = {
  trigger: "Trigger",
  ai: "AI",
  action: "Action",
  output: "Output",
};

/** Small 16x16 glyphs, drawn in node-local space. */
export const KIND_ICON: Record<NodeKind, string> = {
  trigger: "M2 4h12v8H2z M2 4l6 4 6-4",
  ai: "M5 2h6v3h3v6h-3v3H5v-3H2V5h3z",
  action: "M8 1v9 M4.5 6.5L8 10l3.5-3.5 M2 13h12",
  output: "M2 8.5L6 12.5L14 4",
};
