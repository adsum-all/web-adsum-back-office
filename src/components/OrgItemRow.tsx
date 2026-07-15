import { useState } from "react";

import {
  ApiError,
  type OrgDependances,
  type OrgEntity,
  deleteOrganisation,
  editOrganisation,
  getOrgDependances,
  publishOrganisation,
  reaffecterOrganisation,
  renameOrganisation,
} from "../api.js";

/** Extra editable fields for entities that carry more than a name. When present, the
 * inline edit form also exposes the description and/or the parent commission, so an
 * operator no longer has to recreate an item to fix its description or its parent. */
export interface OrgEditConfig {
  /** Current description (undefined = the entity has no description field). */
  description?: string | null;
  /** Current parent commission and the list to reattach to (sous-commission only). */
  parent?: { value: string | null; options: { id: string; nom: string }[]; label: string };
}

interface OrgItemRowProps {
  token: string;
  entity: OrgEntity;
  id: string;
  nom: string;
  /** Type label shown as a badge before the name (e.g. "Commission", "Mission").
   * Purely presentational: it is never part of the editable name. */
  prefix?: string;
  meta?: string;
  publie: boolean;
  /** When provided, the inline "Renommer" form also edits these fields. */
  edit?: OrgEditConfig;
  /** When provided, a "Modifier" button opens the full edit form (all fields),
   * distinct from the inline quick rename. */
  onEdit?: () => void;
  onChanged: () => void;
}

/** A structural-entity row with inline rename, publish toggle and safe delete. */
export function OrgItemRow({ token, entity, id, nom, prefix, meta, publie, edit, onEdit, onChanged }: OrgItemRowProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nom);
  const [draftDesc, setDraftDesc] = useState(edit?.description ?? "");
  const [draftParent, setDraftParent] = useState(edit?.parent?.value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Deletion goes through a dependency analysis: null = closed, otherwise the
  // resolver panel is open with the pre-flight result (what still references this).
  const [deps, setDeps] = useState<OrgDependances | null>(null);
  const [cible, setCible] = useState<string>("");

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Open the inline editor, seeding every field from the current values so the
  // description and the parent are shown (and not silently blank) before editing.
  function startEdit(): void {
    setDraft(nom);
    setDraftDesc(edit?.description ?? "");
    setDraftParent(edit?.parent?.value ?? "");
    setError(null);
    setEditing(true);
  }

  async function saveEdit(): Promise<void> {
    if (!draft.trim()) return;
    const ok = edit
      ? await run(() =>
          editOrganisation(token, entity, id, {
            nom: draft.trim(),
            ...(edit.description !== undefined ? { description: draftDesc.trim() } : {}),
            ...(edit.parent ? { commission_id: draftParent || null } : {}),
          }),
        )
      : await run(() => renameOrganisation(token, entity, id, draft.trim()));
    if (ok) setEditing(false);
  }

  // Open the resolver: fetch what still references this entity before any deletion.
  async function ouvrirSuppression(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const d = await getOrgDependances(token, entity, id);
      setDeps(d);
      setCible("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  async function supprimer(): Promise<void> {
    const ok = await run(() => deleteOrganisation(token, entity, id));
    if (ok) setDeps(null);
  }

  // Reassign every dependent to the chosen target (or detach when empty), then delete.
  async function reaffecterEtSupprimer(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await reaffecterOrganisation(token, entity, id, cible || null);
      await deleteOrganisation(token, entity, id);
      onChanged();
      setDeps(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
      // Refresh the dependency view so the operator sees what remains.
      try { setDeps(await getOrgDependances(token, entity, id)); } catch { /* keep previous */ }
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="list-row org-row">
      <div className="org-row-main">
        {editing ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            <input
              className="search"
              value={draft}
              autoFocus
              placeholder="Nom"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) void saveEdit();
                if (e.key === "Escape") { setDraft(nom); setEditing(false); }
              }}
            />
            {edit?.description !== undefined && (
              <input
                className="search"
                value={draftDesc}
                placeholder="Description"
                onChange={(e) => setDraftDesc(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) void saveEdit(); }}
              />
            )}
            {edit?.parent && (
              <label className="muted small" style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {edit.parent.label}
                <select className="search" style={{ maxWidth: 260 }} value={draftParent} onChange={(e) => setDraftParent(e.target.value)}>
                  <option value="">- Aucune -</option>
                  {edit.parent.options.map((o) => (
                    <option key={o.id} value={o.id}>{o.nom}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        ) : (
          <>
            {prefix && (
              <span className="badge badge-mut" style={{ marginRight: 8, textTransform: "uppercase", fontSize: 10, letterSpacing: 0.4 }}>
                {prefix}
              </span>
            )}
            <strong>{nom}</strong>
            {meta && <span className="muted">{meta}</span>}
          </>
        )}
      </div>
      <div className="org-row-actions">
        <button
          type="button"
          className={`pill ${publie ? "pill-on" : "pill-off"}`}
          disabled={busy}
          title={publie ? "Visible dans les listes membres" : "Masqué aux membres"}
          onClick={() => void run(() => publishOrganisation(token, entity, id, !publie))}
        >
          {publie ? "Publié" : "Masqué"}
        </button>
        {editing ? (
          <>
            <button
              type="button"
              className="btn btn-primary btn-inline"
              disabled={busy || !draft.trim()}
              onClick={() => void saveEdit()}
            >
              Enregistrer
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-inline"
              onClick={() => {
                setDraft(nom);
                setEditing(false);
              }}
            >
              Annuler
            </button>
          </>
        ) : (
          <>
            {onEdit && (
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={onEdit}>
                Modifier
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={startEdit}>
              {edit ? "Modifier" : "Renommer"}
            </button>
          </>
        )}
        <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void ouvrirSuppression()}>
          Supprimer
        </button>
      </div>
      {deps && (
        <div className="org-row-resolver banner" style={{ flexBasis: "100%", marginTop: 8, textAlign: "left", background: "var(--adsum-panel)", border: "1px solid var(--adsum-line)" }}>
          {deps.supprimable ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span>Aucune dépendance. Confirmer la suppression définitive de « {nom} » ?</span>
              <button type="button" className="btn btn-inline" style={{ background: "var(--adsum-danger)", color: "#fff" }} disabled={busy} onClick={() => void supprimer()}>Supprimer définitivement</button>
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setDeps(null)}>Annuler</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <strong>Suppression bloquée : éléments encore rattachés</strong>
              <ul className="muted small" style={{ margin: 0, paddingLeft: 18 }}>
                {deps.references.map((r) => (
                  <li key={r.table}>{r.nombre} {r.label}{r.echantillon.length > 0 ? ` (ex : ${r.echantillon.slice(0, 3).join(", ")}${r.nombre > 3 ? "…" : ""})` : ""}</li>
                ))}
              </ul>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label className="muted small">Réaffecter vers</label>
                <select className="search" style={{ maxWidth: 260 }} value={cible} disabled={busy} onChange={(e) => setCible(e.target.value)}>
                  <option value="">- Détacher (aucune cible) -</option>
                  {deps.cibles.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
                <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void reaffecterEtSupprimer()}>
                  {cible ? "Réaffecter puis supprimer" : "Détacher puis supprimer"}
                </button>
                <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setDeps(null)}>Annuler</button>
              </div>
              <span className="muted small">« Détacher » retire le rattachement (valeur vide) ; « réaffecter » déplace tout vers la cible choisie. Action tracée dans le journal d'audit.</span>
            </div>
          )}
        </div>
      )}
      {error && <span className="banner banner-error org-row-error">{error}</span>}
    </li>
  );
}
