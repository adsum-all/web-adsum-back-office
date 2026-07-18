import { useMemo, useState } from "react";

import type { OrgLink, OrgLinkPatch, OrgLinkType, OrgNode } from "../../api.js";
import { LINK_META, LINK_ORDER } from "./orgLabels.js";

function nodeLabel(n: OrgNode): string {
  const sub = n.membre_nom ?? n.sous_titre;
  return sub ? `${n.nom} - ${sub}` : n.nom;
}

/**
 * Editor for an existing link. A link is corrected, not thrown away: its type and
 * label change here, and either endpoint can be re-attached to another node (the
 * same result as dragging the endpoint on the canvas). Deletion is offered as one
 * option among several, never the only one. A hierarchical move that would close a
 * reporting loop is rejected by the API and surfaced inline.
 */
export function OrgLinkEditor({
  link,
  nodes,
  busy,
  error,
  onSave,
  onDelete,
  onClose,
}: Readonly<{
  link: OrgLink;
  nodes: OrgNode[];
  busy: boolean;
  error: string | null;
  onSave: (patch: OrgLinkPatch) => void;
  onDelete: () => void;
  onClose: () => void;
}>): JSX.Element {
  const [type, setType] = useState<OrgLinkType>(link.type_lien);
  const [libelle, setLibelle] = useState(link.libelle ?? "");
  const [source, setSource] = useState(link.source_id);
  const [cible, setCible] = useState(link.cible_id);

  const options = useMemo(
    () => [...nodes].filter((n) => n.type_noeud !== "separateur").sort((a, b) => nodeLabel(a).localeCompare(nodeLabel(b))),
    [nodes],
  );
  const nomOf = useMemo(() => new Map(nodes.map((n) => [n.id, nodeLabel(n)])), [nodes]);
  const memeNoeud = source === cible;

  return (
    <div className="org-modal-root" role="dialog" aria-modal="true" aria-label="Modifier le lien">
      <div className="org-modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="org-modal">
        <h2 className="org-modal-title">Modifier le lien</h2>
        <p className="muted small">
          Corrigez un lien sans le supprimer : changez son type, son libellé, ou déplacez une extrémité vers un autre
          nœud. Vous pouvez aussi glisser directement l'extrémité du trait sur le graphe.
        </p>

        <label className="org-modal-field">
          <span>Type de lien</span>
          <select value={type} onChange={(e) => setType(e.target.value as OrgLinkType)}>
            {LINK_ORDER.map((t) => (
              <option key={t} value={t}>
                {LINK_META[t].label}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small">{LINK_META[type].description}</p>

        <label className="org-modal-field">
          <span>Depuis (source)</span>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {options.map((n) => (
              <option key={n.id} value={n.id}>
                {nomOf.get(n.id)}
              </option>
            ))}
          </select>
        </label>
        <label className="org-modal-field">
          <span>Vers (cible)</span>
          <select value={cible} onChange={(e) => setCible(e.target.value)}>
            {options.map((n) => (
              <option key={n.id} value={n.id}>
                {nomOf.get(n.id)}
              </option>
            ))}
          </select>
        </label>

        <label className="org-modal-field">
          <span>Libellé (facultatif)</span>
          <input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Ex : Supervision directe" maxLength={120} />
        </label>

        {memeNoeud ? <p className="banner banner-error">La source et la cible doivent être deux nœuds différents.</p> : null}
        {error ? <p className="banner banner-error">{error}</p> : null}

        <div className="org-modal-actions-split">
          <button type="button" className="btn btn-danger btn-inline" onClick={onDelete} disabled={busy}>
            Supprimer le lien
          </button>
          <div className="org-modal-actions-right">
            <button type="button" className="btn btn-ghost btn-inline" onClick={onClose} disabled={busy}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-primary btn-inline"
              disabled={busy || memeNoeud}
              onClick={() =>
                onSave({
                  type_lien: type,
                  libelle: libelle.trim() || null,
                  source_id: source,
                  cible_id: cible,
                })
              }
            >
              {busy ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
