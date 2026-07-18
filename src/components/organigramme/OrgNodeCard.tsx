import { type CSSProperties, useContext } from "react";
import { Handle, type NodeProps, Position, type Node } from "@xyflow/react";

import type { OrgNode } from "../../api.js";
import { CategorieBadge } from "../CategorieBadge.js";
import { OrgCanvasContext } from "./orgContext.js";
import { STATUT_META, TYPE_NOEUD_LABEL, initiales } from "./orgLabels.js";

export interface OrgNodeData extends Record<string, unknown> {
  node: OrgNode;
  hasChildren: boolean;
  /** Number of descendants hidden while this node is collapsed. */
  hiddenCount: number;
}

export type OrgFlowNode = Node<OrgNodeData, "org">;

/** Premium card used as a React Flow custom node: avatar with initials, name,
 * perimeter subtitle, category badge, member count and an accessible status
 * indicator. In edit mode it exposes an inline edit and delete menu; in both
 * modes a parent with children can collapse or expand its branch. Interactive
 * controls carry the React Flow "nodrag" class so a click never starts a drag. */
export function OrgNodeCard({ data, selected }: NodeProps<OrgFlowNode>): JSX.Element {
  const ctx = useContext(OrgCanvasContext);
  const { node, hasChildren, hiddenCount } = data;
  const statut = STATUT_META[node.statut];
  const collapsed = ctx?.collapsed.has(node.id) ?? false;
  const editable = ctx?.mode === "edition";

  // The displayed name is the assigned member first (kept in sync when a member is
  // affected to the node), otherwise the node's own label. The function/scope is
  // the subtitle. When the photo is enabled and available, it replaces the initials.
  const nomAffiche = node.membre_nom ?? node.nom;
  const sousTitre = node.membre_nom && node.membre_nom !== node.nom ? node.nom : node.sous_titre;
  const montrerPhoto = node.afficher_photo && !!node.photo_url;
  const style = node.couleur ? ({ "--org-accent": node.couleur } as CSSProperties) : undefined;

  return (
    <div
      className={`org-node org-node-${node.statut} ${selected ? "is-selected" : ""} ${
        node.type_noeud === "personne" ? "" : "org-node-unit"
      } ${node.couleur ? "org-node-colore" : ""}`}
      data-kind={node.type_noeud}
      style={style}
    >
      <Handle id="t" type="target" position={Position.Top} className="org-h" />
      <Handle id="b" type="source" position={Position.Bottom} className="org-h" />
      <Handle id="l-in" type="target" position={Position.Left} className="org-h" style={{ top: "38%" }} />
      <Handle id="l-out" type="source" position={Position.Left} className="org-h" style={{ top: "62%" }} />
      <Handle id="r-in" type="target" position={Position.Right} className="org-h" style={{ top: "38%" }} />
      <Handle id="r-out" type="source" position={Position.Right} className="org-h" style={{ top: "62%" }} />

      <div className="org-node-top">
        {montrerPhoto ? (
          <img className="org-avatar org-avatar-photo" src={node.photo_url ?? ""} alt="" data-kind={node.type_noeud} />
        ) : (
          <span className="org-avatar" data-kind={node.type_noeud} aria-hidden="true">
            {initiales(nomAffiche)}
          </span>
        )}
        <span className="org-node-body">
          <span className="org-node-name" title={nomAffiche}>
            {nomAffiche}
          </span>
          {sousTitre ? (
            <span className="org-node-sub" title={sousTitre}>
              {sousTitre}
            </span>
          ) : (
            <span className="org-node-sub org-node-sub-mut">{TYPE_NOEUD_LABEL[node.type_noeud]}</span>
          )}
        </span>
      </div>

      <div className="org-node-meta">
        {node.categorie ? <CategorieBadge code={node.categorie} /> : null}
        {node.effectif !== null && node.effectif !== undefined ? (
          <span className="org-count">{node.effectif} membre{node.effectif > 1 ? "s" : ""}</span>
        ) : null}
        <span className="org-status">
          <span className={`org-dot org-dot-${statut.cle}`} aria-hidden="true" />
          {statut.label}
        </span>
      </div>

      {editable ? (
        <div className="org-node-actions nodrag">
          <button
            type="button"
            className="org-mini-btn"
            onClick={() => ctx?.onEdit(node)}
            title="Éditer ce nœud"
          >
            Éditer
          </button>
          <button
            type="button"
            className="org-mini-btn org-mini-danger"
            onClick={() => ctx?.onDelete(node)}
            title="Supprimer ce nœud"
          >
            Supprimer
          </button>
        </div>
      ) : null}

      {hasChildren ? (
        <button
          type="button"
          className={`org-collapse nodrag ${collapsed ? "is-collapsed" : ""}`}
          onClick={() => ctx?.onToggleCollapse(node.id)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Déplier ${hiddenCount} entité${hiddenCount > 1 ? "s" : ""} rattachée${hiddenCount > 1 ? "s" : ""}` : "Replier la branche"}
          title={collapsed ? "Déplier la branche" : "Replier la branche"}
        >
          {collapsed ? `+${hiddenCount}` : <span className="org-caret" aria-hidden="true" />}
        </button>
      ) : null}
    </div>
  );
}
