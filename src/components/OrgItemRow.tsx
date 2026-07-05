import { useState } from "react";

import { ApiError, type OrgEntity, deleteOrganisation, publishOrganisation, renameOrganisation } from "../api.js";

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
  /** When provided, a "Modifier" button opens the full edit form (all fields),
   * distinct from the inline quick rename. */
  onEdit?: () => void;
  onChanged: () => void;
}

/** A structural-entity row with inline rename, publish toggle and safe delete. */
export function OrgItemRow({ token, entity, id, nom, prefix, meta, publie, onEdit, onChanged }: OrgItemRowProps): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(nom);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <li className="list-row org-row">
      <div className="org-row-main">
        {editing ? (
          <input
            className="search"
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                void run(() => renameOrganisation(token, entity, id, draft.trim())).then((ok) => ok && setEditing(false));
              }
              if (e.key === "Escape") {
                setDraft(nom);
                setEditing(false);
              }
            }}
          />
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
              onClick={() => void run(() => renameOrganisation(token, entity, id, draft.trim())).then((ok) => ok && setEditing(false))}
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
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setEditing(true)}>
              Renommer
            </button>
          </>
        )}
        {confirmDelete ? (
          <>
            <button
              type="button"
              className="btn btn-inline"
              style={{ background: "var(--adsum-danger)", color: "#fff" }}
              disabled={busy}
              onClick={() => void run(() => deleteOrganisation(token, entity, id)).then((ok) => ok && setConfirmDelete(false))}
            >
              Confirmer
            </button>
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setConfirmDelete(false)}>
              Non
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setConfirmDelete(true)}>
            Supprimer
          </button>
        )}
      </div>
      {error && <span className="banner banner-error org-row-error">{error}</span>}
    </li>
  );
}
