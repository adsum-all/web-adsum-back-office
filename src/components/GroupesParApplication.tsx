import { useMemo, useState } from "react";

import {
  type ApplicationAcces,
  type GroupeAcces,
  getApplications,
  getCataloguePermissions,
  getGroupes,
} from "../api.js";
import { useResource } from "../useResource.js";
import { GroupeForm } from "./GroupeForm.js";
import { roleLabel } from "./utilisateursShared.js";

/** Groups that carry no application tag are cross-application (transverse). */
const TRANSVERSE = "__transverse__";

/**
 * Per-application breakdown of access groups. Each application gets its own card
 * listing the groups scoped to it, with a button to create a new group already
 * targeted at that application. A final "Transverse" card gathers the groups that
 * serve no single application. This makes it obvious which application every access
 * group belongs to, and keeps app-targeted group creation one click away.
 */
export function GroupesParApplication({ token, canSysteme = false }: { token: string; canSysteme?: boolean }): JSX.Element {
  const groupes = useResource(() => getGroupes(token, true), [token]);
  const applications = useResource(() => getApplications(token), [token]);
  const catalogue = useResource(() => getCataloguePermissions(token), [token]);
  // Which application the create form targets; null when the form is closed.
  const [creerPour, setCreerPour] = useState<string | null>(null);

  const parApp = useMemo(() => {
    const map = new Map<string, GroupeAcces[]>();
    for (const g of groupes.data ?? []) {
      const cle = g.application_code ?? TRANSVERSE;
      const list = map.get(cle) ?? [];
      list.push(g);
      map.set(cle, list);
    }
    return map;
  }, [groupes.data]);

  const apps: (ApplicationAcces | { code: string; nom: string })[] = useMemo(() => {
    const base = (applications.data ?? []).map((a) => ({ ...a, nom: a.nom.replace(/^ADSUM\s+/i, "") }));
    return [...base, { code: TRANSVERSE, nom: "Transverse (aucune application précise)" }];
  }, [applications.data]);

  function afterForm(): void {
    setCreerPour(null);
    groupes.reload();
  }

  return (
    <div>
      <header className="page-head">
        <div>
          <h2 className="section-title">Groupes par application</h2>
          <p className="muted small">
            Chaque application regroupe ses propres groupes d'accès. Créez un groupe déjà rattaché à une application
            pour cibler ses droits, ou consultez le classement existant. Le rattachement organise l'affichage : il
            n'élargit jamais les droits accordés.
          </p>
        </div>
      </header>

      {groupes.error && <p className="banner banner-error">{groupes.error}</p>}

      {canSysteme && creerPour && catalogue.data && (
        <GroupeForm
          token={token}
          catalogue={catalogue.data}
          applicationInitial={creerPour === TRANSVERSE ? "" : creerPour}
          onDone={afterForm}
          onCancel={() => setCreerPour(null)}
        />
      )}

      <div className="app-groups-grid" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
        {groupes.loading && <p className="muted">Chargement...</p>}
        {apps.map((a) => {
          const list = (parApp.get(a.code) ?? []).sort((x, y) => x.libelle.localeCompare(y.libelle));
          const transverse = a.code === TRANSVERSE;
          return (
            <section key={a.code} className="form-card" style={{ margin: 0 }}>
              <div className="page-head" style={{ marginBottom: 8 }}>
                <div>
                  <h3 className="section-title" style={{ marginBottom: 2 }}>{a.nom}</h3>
                  <span className="muted small">{list.length} groupe{list.length > 1 ? "s" : ""}</span>
                </div>
                {canSysteme && (
                  <button type="button" className="link" onClick={() => setCreerPour(a.code)}>
                    + Créer un groupe {transverse ? "transverse" : "pour cette application"}
                  </button>
                )}
              </div>
              {list.length === 0 ? (
                <p className="muted small">Aucun groupe rattaché.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {list.map((g) => (
                    <li key={g.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, opacity: g.actif ? 1 : 0.55 }}>
                      <span style={{ minWidth: 0 }}>
                        <strong style={{ display: "block" }}>{g.libelle}</strong>
                        <span className="muted small">
                          {g.mode === "permissions"
                            ? `${g.permissions.length} permission${g.permissions.length > 1 ? "s" : ""}`
                            : `rôle : ${roleLabel(g.role_accorde)}`}
                          {g.systeme ? " (système)" : ""}
                        </span>
                      </span>
                      <span style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                        <span className="badge badge-mut">{g.membres_count}</span>
                        <span className={`badge ${g.actif ? "badge-ok" : "badge-mut"}`}>{g.actif ? "Actif" : "Off"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
