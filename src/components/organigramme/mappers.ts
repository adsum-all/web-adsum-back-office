import { type Edge, MarkerType } from "@xyflow/react";

import type { OrgLink, OrgNode } from "../../api.js";
import { LINK_META } from "./orgLabels.js";
import type { XY } from "./layout.js";
import type { OrgFlowNode } from "./OrgNodeCard.js";

export interface Hierarchy {
  /** parent id -> ordered child ids, built from the hierarchical links only. */
  children: Map<string, string[]>;
}

export function buildHierarchy(links: OrgLink[]): Hierarchy {
  const children = new Map<string, string[]>();
  for (const l of links) {
    if (l.type_lien !== "hierarchique") continue;
    const list = children.get(l.source_id) ?? [];
    list.push(l.cible_id);
    children.set(l.source_id, list);
  }
  return { children };
}

/** All hierarchical descendants of a node (guards against a malformed cycle). */
export function descendants(id: string, h: Hierarchy): Set<string> {
  const out = new Set<string>();
  const stack = [...(h.children.get(id) ?? [])];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    if (out.has(cur)) continue;
    out.add(cur);
    for (const c of h.children.get(cur) ?? []) stack.push(c);
  }
  return out;
}

/** Union of the hidden subtrees: every descendant of every collapsed node. */
export function hiddenIds(collapsed: ReadonlySet<string>, h: Hierarchy): Set<string> {
  const hidden = new Set<string>();
  for (const id of collapsed) {
    for (const d of descendants(id, h)) hidden.add(d);
  }
  return hidden;
}

/** Pick the source/target handle ids so hierarchical links flow top to bottom and
 * transversal links attach on the sides, choosing the near sides by geometry so an
 * overlay edge never crosses back over a card. */
function handlesFor(
  orientation: "vertical" | "horizontal",
  source: XY,
  target: XY,
): { sourceHandle: string; targetHandle: string } {
  if (orientation === "vertical") {
    return { sourceHandle: "b", targetHandle: "t" };
  }
  if (target.x >= source.x) {
    return { sourceHandle: "r-out", targetHandle: "l-in" };
  }
  return { sourceHandle: "l-out", targetHandle: "r-in" };
}

export interface FlowData {
  flowNodes: OrgFlowNode[];
  flowEdges: Edge[];
}

/** Turn the API content into React Flow nodes and edges for the current collapse
 * state. Nodes inside a collapsed branch are dropped, and any edge touching a
 * hidden node is dropped with it, so the canvas stays consistent. */
export function buildFlow(
  nodes: OrgNode[],
  links: OrgLink[],
  positions: Map<string, XY>,
  collapsed: ReadonlySet<string>,
): FlowData {
  const h = buildHierarchy(links);
  const hidden = hiddenIds(collapsed, h);
  const present = new Set(nodes.map((n) => n.id));

  const flowNodes: OrgFlowNode[] = nodes
    .filter((n) => !hidden.has(n.id))
    .map((n) => {
      const kids = h.children.get(n.id) ?? [];
      return {
        id: n.id,
        type: "org" as const,
        position: positions.get(n.id) ?? { x: 0, y: 0 },
        data: { node: n, hasChildren: kids.length > 0, hiddenCount: descendants(n.id, h).size },
      };
    });

  const flowEdges: Edge[] = [];
  for (const l of links) {
    if (!present.has(l.source_id) || !present.has(l.cible_id)) continue;
    if (hidden.has(l.source_id) || hidden.has(l.cible_id)) continue;
    const meta = LINK_META[l.type_lien];
    const src = positions.get(l.source_id) ?? { x: 0, y: 0 };
    const tgt = positions.get(l.cible_id) ?? { x: 0, y: 0 };
    const { sourceHandle, targetHandle } = handlesFor(meta.orientation, src, tgt);
    const solid = l.type_lien === "hierarchique" || l.type_lien === "coordination"
      || l.type_lien === "supervision" || l.type_lien === "responsabilite_tribu";
    flowEdges.push({
      id: l.id,
      source: l.source_id,
      target: l.cible_id,
      sourceHandle,
      targetHandle,
      type: meta.routing,
      label: l.libelle ?? undefined,
      deletable: false,
      markerEnd: {
        type: solid ? MarkerType.ArrowClosed : MarkerType.Arrow,
        color: meta.color,
        width: 18,
        height: 18,
      },
      style: { stroke: meta.color, strokeWidth: 2, strokeDasharray: meta.dash || undefined },
      labelStyle: { fill: meta.color, fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: "var(--adsum-panel)", fillOpacity: 0.9 },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 6,
      className: `org-edge org-edge-${l.type_lien}`,
    });
  }

  return { flowNodes, flowEdges };
}
