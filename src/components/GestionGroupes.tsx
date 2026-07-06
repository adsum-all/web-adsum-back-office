import { useMemo, useState } from "react";

import {
  ApiError,
  type GroupeAcces,
  deleteGroupe,
  getCataloguePermissions,
  getGroupes,
  updateGroupe,
} from "../api.js";
import { useResource } from "../useResource.js";
import { GroupeForm } from "./GroupeForm.js";
import { roleLabel } from "./utilisateursShared.js";

/**
 * "Groupes d'accès" tab: browse, search and fully manage access groups. The
 * superadmin can create (role or permission groups), edit, activate/deactivate and
 * delete a custom group. System groups are read-only. Every action goes through the
 * server, which enforces least privilege and audits the change.
 */
export function GestionGroupes({ token }: { token: string }): JSX.Element {
  const groupes = useResource(() => getGroupes(token, true), [token]);
  const catalogue = useResource(() => getCataloguePermissions(token), [token]);
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<"tous" | "role" | "permissions">("tous");
  const [creer, setCreer] = useState(false);
  const [edit, setEdit] = useState<GroupeAcces | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (groupes.data ?? [])
      .filter((g) => (filtre === "tous" ? true : g.mode === filtre))
      .filter((g) => !term || g.libelle.toLowerCase().includes(term) || g.cle.toLowerCase().includes(term));
  }, [groupes.data, q, filtre]);

  async function run(id: string, action: () => Promise<unknown>): Promise<void> {
    setBusy(id);
    setError(null);
    try {
      await action();
      groupes.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(null);
    }
  }

  function afterForm(): void {
    setCreer(false);
    setEdit(null);
    groupes.reload();
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <h2 className="section-title">Groupes d'accès</h2>
          <p className="muted small">
            Chaque groupe accorde soit un rôle plateforme, soit un jeu de permissions précises. Refus par défaut :
            un membre sans groupe n'a aucun accès. Les groupes système ne sont pas modifiables.
          </p>
        </div>
        {catalogue.data && (
          <button type="button" className="btn btn-primary btn-inline" onClick={() => { setCreer(true); setEdit(null); }}>
            + Nouveau groupe
          </button>
        )}
      </header>

      {error && <p className="banner banner-error">{error}</p>}
      {groupes.error && <p className="banner banner-error">{groupes.error}</p>}

      {(creer || edit) && catalogue.data && (
        <GroupeForm
          token={token}
          catalogue={catalogue.data}
          existing={edit ?? undefined}
          onDone={afterForm}
          onCancel={() => { setCreer(false); setEdit(null); }}
        />
      )}

      <div className="form-inline" style={{ margin: "12px 0" }}>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un groupe" />
        <select value={filtre} onChange={(e) => setFiltre(e.target.value as "tous" | "role" | "permissions")}>
          <option value="tous">Tous les types</option>
          <option value="role">Groupes de rôle</option>
          <option value="permissions">Groupes de permissions</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Groupe</th>
              <th>Accorde</th>
              <th>Membres</th>
              <th>État</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {groupes.loading && <tr><td colSpan={5} className="muted">Chargement...</td></tr>}
            {!groupes.loading && items.length === 0 && <tr><td colSpan={5} className="muted">Aucun groupe.</td></tr>}
            {items.map((g) => (
              <tr key={g.id} style={{ opacity: g.actif ? 1 : 0.55 }}>
                <td>
                  <div className="event-main">
                    <strong>{g.libelle}</strong>
                    <span className="mono muted small">{g.cle}{g.systeme ? " (système)" : ""}</span>
                    {g.description && <span className="muted small">{g.description}</span>}
                  </div>
                </td>
                <td>
                  {g.mode === "permissions" ? (
                    <span className="badge badge-ok" title={g.permissions.join(", ")}>
                      {g.permissions.length} permission{g.permissions.length > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="badge badge-ok">rôle : {roleLabel(g.role_accorde)}</span>
                  )}
                </td>
                <td className="muted small">{g.membres_count}</td>
                <td>
                  <span className={`badge ${g.actif ? "badge-ok" : "badge-mut"}`}>{g.actif ? "Actif" : "Désactivé"}</span>
                </td>
                <td>
                  {g.systeme ? (
                    <span className="muted small">non modifiable</span>
                  ) : (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button type="button" className="link" onClick={() => { setEdit(g); setCreer(false); }}>Modifier</button>
                      <button
                        type="button"
                        className="link"
                        disabled={busy === g.id}
                        onClick={() => void run(g.id, () => updateGroupe(token, g.id, { actif: !g.actif }))}
                      >
                        {g.actif ? "Désactiver" : "Réactiver"}
                      </button>
                      <button
                        type="button"
                        className="link"
                        disabled={busy === g.id || g.membres_count > 0}
                        title={g.membres_count > 0 ? "Retirez d'abord les membres" : "Supprimer"}
                        onClick={() => void run(g.id, () => deleteGroupe(token, g.id))}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
