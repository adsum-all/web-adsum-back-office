import dagre from "dagre";

import type { OrgLink, OrgNode } from "../../api.js";

export interface XY {
  x: number;
  y: number;
}

/** Fixed footprint of a node card, shared by dagre (spacing) and the CSS width. */
export const NODE_W = 236;
export const NODE_H = 96;

/** Automatic top to bottom layout built from the hierarchical links only. The
 * secondary links (coordination, supervision, transversal follow-up, tribe
 * responsibility, assistance) are deliberately excluded so they never distort the
 * ranks of the main tree; they are drawn afterwards as styled overlay edges. The
 * returned coordinates are top-left based, as React Flow expects. */
export function computeLayout(nodes: OrgNode[], links: OrgLink[]): Map<string, XY> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 48, ranksep: 96, marginx: 32, marginy: 32 });
  g.setDefaultEdgeLabel(() => ({}));

  const ids = new Set(nodes.map((n) => n.id));
  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_W, height: NODE_H });
  }
  for (const l of links) {
    if (l.type_lien === "hierarchique" && ids.has(l.source_id) && ids.has(l.cible_id)) {
      g.setEdge(l.source_id, l.cible_id);
    }
  }

  dagre.layout(g);

  const out = new Map<string, XY>();
  for (const n of nodes) {
    const dn = g.node(n.id) as { x?: number; y?: number } | undefined;
    if (dn && typeof dn.x === "number" && typeof dn.y === "number") {
      out.set(n.id, { x: dn.x - NODE_W / 2, y: dn.y - NODE_H / 2 });
    } else {
      out.set(n.id, { x: 0, y: 0 });
    }
  }
  return out;
}

/** Final on-canvas position of each node: an explicit stored position (an admin
 * dragged the card, the choice is persisted server side) always wins over the
 * automatic dagre coordinate, so a manual arrangement survives a reload. */
export function resolvePositions(nodes: OrgNode[], links: OrgLink[]): Map<string, XY> {
  const auto = computeLayout(nodes, links);
  const out = new Map<string, XY>();
  for (const n of nodes) {
    const hasStored = n.pos_x !== null && n.pos_x !== undefined && n.pos_y !== null && n.pos_y !== undefined;
    if (hasStored) {
      out.set(n.id, { x: n.pos_x as number, y: n.pos_y as number });
    } else {
      out.set(n.id, auto.get(n.id) ?? { x: 0, y: 0 });
    }
  }
  return out;
}
