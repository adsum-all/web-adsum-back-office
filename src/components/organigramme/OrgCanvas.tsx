import { useCallback, useEffect, useMemo, useState } from "react";
import "@xyflow/react/dist/style.css";
import "./organigramme.css";
import "./organigramme-parts.css";
import {
  Background,
  BackgroundVariant,
  type Connection,
  Controls,
  type Edge,
  MiniMap,
  type Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";

import type { OrgContenu, OrgNode } from "../../api.js";
import { computeLayout, NODE_H, NODE_W, resolvePositions } from "./layout.js";
import { buildFlow } from "./mappers.js";
import { OrgCanvasContext, type OrgMode } from "./orgContext.js";
import { OrgLegende } from "./OrgLegende.js";
import { OrgNodeCard } from "./OrgNodeCard.js";
import { OrgSeparator } from "./OrgSeparator.js";

const nodeTypes: NodeTypes = { org: OrgNodeCard, separateur: OrgSeparator };

export interface OrgCanvasProps {
  contenu: OrgContenu;
  mode: OrgMode;
  onNodeMoved?: (id: string, x: number, y: number) => void;
  onEditNode?: (node: OrgNode) => void;
  onDeleteNode?: (node: OrgNode) => void;
  onConnectLink?: (source: string, target: string) => void;
  onDeleteLink?: (linkId: string) => void;
  onAddSeparator?: () => void;
  onAutoLayout?: (positions: { id: string; x: number; y: number }[]) => void;
}

const noop = (): void => undefined;
const normalize = (s: string): string => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Stable fingerprint of the content that actually affects the drawing. A 20s
 * background poll returns a fresh object with identical data: keying the layout on
 * this string, not on object identity, stops such a poll from re-syncing the canvas
 * and wiping a search highlight or an in-progress drag. */
function signatureOf(c: OrgContenu): string {
  const n = c.noeuds
    .map((x) => `${x.id}:${x.pos_x}:${x.pos_y}:${x.statut}:${x.nom}:${x.sous_titre ?? ""}:${x.effectif ?? ""}`)
    .join("|");
  const l = c.liens.map((x) => `${x.id}:${x.type_lien}:${x.source_id}:${x.cible_id}:${x.libelle ?? ""}`).join("|");
  return `${c.version.id}#${n}#${l}`;
}

/** Parents whose sub-branches are folded by default, so the first view is a
 * readable synthetic one: the deep commission branches and the tribe members are
 * hidden until the reader expands them. */
/** The general view keeps only the big blocks: the functional chain down to the
 * general steward, then the folded "Intendances", "Coordinations" and "Patriarchs"
 * blocks (each with its count), plus the College. Everything deeper is folded so the
 * reader expands one level at a time, horizontally then vertically. */
const BLOCS_REPLIES = new Set([
  "bloc_intendances",
  "bloc_coordinations",
  "groupe_patriarches",
  "respgrp_int",
  "respgrp_coord",
]);

function defautReplie(nodes: OrgContenu["noeuds"]): Set<string> {
  const out = new Set<string>();
  for (const n of nodes) {
    const c = n.cle ?? "";
    if (BLOCS_REPLIES.has(c) || c.startsWith("tribu:") || c.startsWith("commission:")) out.add(n.id);
  }
  return out;
}

function OrgCanvasInner({
  contenu,
  mode,
  onNodeMoved,
  onEditNode,
  onDeleteNode,
  onConnectLink,
  onDeleteLink,
  onAddSeparator,
  onAutoLayout,
}: OrgCanvasProps): JSX.Element {
  const rf = useReactFlow();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => defautReplie(contenu.noeuds));
  const [query, setQuery] = useState("");
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  const contentSig = useMemo(() => signatureOf(contenu), [contenu]);
  // Keyed on the content signature, not on object identity, so an identical poll is a no-op.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const layout = useMemo(() => resolvePositions(contenu.noeuds, contenu.liens), [contentSig]);
  const positions = layout.positions;
  const desired = useMemo(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    () => buildFlow(contenu.noeuds, contenu.liens, positions, collapsed, layout.separatorHeight),
    [contentSig, positions, collapsed],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Re-sync the canvas only when structure, positions or collapse state change:
  // a drag mutates React Flow local state without touching these inputs, so a
  // manual arrangement is never clobbered before it is persisted and reloaded.
  useEffect(() => {
    setNodes(desired.flowNodes);
    setEdges(desired.flowEdges);
  }, [desired, setNodes, setEdges]);

  // Frame the whole graph whenever the visible set of nodes changes.
  const structureKey = desired.flowNodes.map((n) => n.id).join(",");
  useEffect(() => {
    const handle = window.setTimeout(() => {
      // Cap the zoom so cards stay readable when only a few nodes are visible
      // (a sparse synthetic view would otherwise zoom out until cards are tiny).
      void rf.fitView({ padding: 0.18, duration: 400, minZoom: 0.4, maxZoom: 1 });
    }, 60);
    return () => window.clearTimeout(handle);
  }, [structureKey, rf]);

  const onToggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Reset to the synthetic default whenever the version changes (not on a poll).
  const versionId = contenu.version.id;
  useEffect(() => {
    setCollapsed(defautReplie(contenu.noeuds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId]);

  // "Afficher tout": expand everything. "Réduire tout": fold every parent.
  // "Vue générale": back to the big-blocks synthetic view.
  const toutAfficher = useCallback(() => setCollapsed(new Set<string>()), []);
  const toutReduire = useCallback(() => {
    const parents = new Set<string>();
    for (const l of contenu.liens) if (l.type_lien === "hierarchique") parents.add(l.source_id);
    setCollapsed(parents);
  }, [contenu.liens]);
  const vueGenerale = useCallback(() => setCollapsed(defautReplie(contenu.noeuds)), [contenu.noeuds]);

  const ctxValue = useMemo(
    () => ({
      mode,
      collapsed,
      onToggleCollapse,
      onEdit: onEditNode ?? noop,
      onDelete: onDeleteNode ?? noop,
    }),
    [mode, collapsed, onToggleCollapse, onEditNode, onDeleteNode],
  );

  const runSearch = useCallback(
    (raw: string) => {
      const q = normalize(raw.trim());
      if (!q) {
        setSearchMsg(null);
        return;
      }
      const found = contenu.noeuds.find((n) =>
        [n.nom, n.sous_titre ?? "", n.fonction_cle ?? ""].some((f) => normalize(f).includes(q)),
      );
      if (!found) {
        setSearchMsg("Aucun nœud ne correspond.");
        return;
      }
      setSearchMsg(null);
      // Un-collapse everything so a match hidden inside a folded branch is revealed.
      setCollapsed(new Set<string>());
      const pos = positions.get(found.id);
      window.setTimeout(() => {
        if (pos) void rf.setCenter(pos.x + NODE_W / 2, pos.y + NODE_H / 2, { zoom: 1.15, duration: 500 });
        setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === found.id })));
      }, 90);
    },
    [contenu.noeuds, positions, rf, setNodes],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      if (mode === "edition" && onConnectLink && c.source && c.target && c.source !== c.target) {
        onConnectLink(c.source, c.target);
      }
    },
    [mode, onConnectLink],
  );

  const editable = mode === "edition";

  return (
    <OrgCanvasContext.Provider value={ctxValue}>
      <div className="org-canvas-inner">
        {/* A real toolbar ABOVE the canvas, so tools are always visible and never
            covered by the cards or hidden behind the flow. */}
        <div className="org-bar">
          <form
            className="org-search"
            onSubmit={(e) => {
              e.preventDefault();
              runSearch(query);
            }}
            role="search"
          >
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value) setSearchMsg(null);
              }}
              placeholder="Rechercher un nom, une fonction..."
              aria-label="Rechercher un nœud dans l'organigramme"
            />
            <button type="submit" className="btn btn-primary btn-inline">Centrer</button>
          </form>
          <span className="org-bar-sep" aria-hidden="true" />
          <button type="button" className="btn btn-ghost btn-inline" onClick={vueGenerale} title="Afficher uniquement les grands blocs">
            Vue générale
          </button>
          <button type="button" className="btn btn-ghost btn-inline" onClick={toutAfficher} title="Déplier toutes les branches">
            Afficher tout
          </button>
          <button type="button" className="btn btn-ghost btn-inline" onClick={toutReduire} title="Replier toutes les branches">
            Réduire tout
          </button>
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => void rf.fitView({ padding: 0.18, duration: 400, maxZoom: 1 })} title="Adapter à l'écran">
            Adapter à l'écran
          </button>
          {editable ? (
            <>
              <span className="org-bar-sep" aria-hidden="true" />
              <button type="button" className="btn btn-ghost btn-inline" onClick={() => onAddSeparator?.()} title="Ajouter un trait de séparation">
                + Séparateur
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-inline"
                onClick={() => {
                  const auto = computeLayout(contenu.noeuds, contenu.liens).positions;
                  onAutoLayout?.(contenu.noeuds.map((n) => {
                    const p = auto.get(n.id) ?? { x: 0, y: 0 };
                    return { id: n.id, x: Math.round(p.x), y: Math.round(p.y) };
                  }));
                }}
                title="Recalculer la disposition en deux colonnes et l'enregistrer"
              >
                Disposition automatique
              </button>
            </>
          ) : null}
          {searchMsg ? <span className="org-search-msg">{searchMsg}</span> : null}
        </div>
        <div className="org-flow">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={(_, node) => onNodeMoved?.(node.id, Math.round(node.position.x), Math.round(node.position.y))}
            onEdgeClick={(_, edge) => {
              if (editable) onDeleteLink?.(edge.id);
            }}
            nodesDraggable={editable}
            nodesConnectable={editable}
            elementsSelectable
            deleteKeyCode={null}
            minZoom={0.2}
            maxZoom={2}
            fitView
            fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
            proOptions={{ hideAttribution: true }}
            aria-label="Organigramme hiérarchique"
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--adsum-dot)" />
            <Controls position="bottom-left" showInteractive={editable} />
            <MiniMap
              position="bottom-right"
              pannable
              zoomable
              ariaLabel="Vue d'ensemble de l'organigramme"
              nodeColor={() => "#c3cde6"}
              maskColor="rgba(16, 18, 24, 0.08)"
            />
            <Panel position="top-right">
              <OrgLegende />
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </OrgCanvasContext.Provider>
  );
}

/** React Flow canvas shared by both modes. Wrapped in its own provider so the
 * search box and the fit-to-view controls can call the flow instance, and so two
 * canvases (published view, draft editor) never share one store. */
export function OrgCanvas(props: OrgCanvasProps): JSX.Element {
  return (
    <ReactFlowProvider>
      <OrgCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
