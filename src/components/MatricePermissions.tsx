import { useMemo, useState } from "react";

import { type CataloguePermissions, type PermissionItem, getCataloguePermissions } from "../api.js";
import { useResource } from "../useResource.js";
import { PermissionDrawer } from "./PermissionDrawer.js";
import { Tabs } from "./Tabs.js";
import { usePagination } from "../usePagination.js";
import { Pagination } from "./Pagination.js";

const ROLE_LABELS: Record<string, string> = {
  membre: "Membre",
  controleur: "Contrôleur",
  gestionnaire: "Gestionnaire",
  direction: "Direction",
  admin: "Administrateur",
  super_admin: "Super-admin",
};

const RISK_LABELS: Record<string, string> = {
  faible: "Faible",
  moyen: "Moyen",
  eleve: "Élevé",
  critique: "Critique",
};

// Risk colors are inline so the component is self-contained and does not rely on
// class names it cannot see. They only convey the same information as the label.
const RISK_COLORS: Record<string, string> = {
  faible: "#2f9e44",
  moyen: "#f08c00",
  eleve: "#e8590c",
  critique: "#c92a2a",
};

function RiskBadge({ risque }: { risque: string }): JSX.Element {
  return (
    <span className="badge" style={{ background: RISK_COLORS[risque] ?? "#868e96", color: "#fff" }}>
      {RISK_LABELS[risque] ?? risque}
    </span>
  );
}

/**
 * Read-only access matrix. It mirrors, for every atomic permission, which role
 * holds it and which specialized (permission-mode) groups grant it. The screen is
 * informational only: the server enforces every action through require_permission.
 */
export function MatricePermissions({ token }: { token: string }): JSX.Element {
  const catalogue = useResource<CataloguePermissions>(() => getCataloguePermissions(token), [token]);
  const data = catalogue.data;

  const heldByRole = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of data?.roles ?? []) map.set(r.role, new Set(r.permissions));
    return map;
  }, [data]);

  const parCle = useMemo(() => {
    const map = new Map<string, PermissionItem>();
    for (const p of data?.permissions ?? []) map.set(p.cle, p);
    return map;
  }, [data]);

  const roles = data?.roles.map((r) => r.role) ?? [];
  // Pagine par DOMAINE : borner le tableau sans jamais separer une permission
  // de son domaine, qui est ce qui rend la matrice lisible.
  const pagination = usePagination(data?.domaines ?? [], 5);
  const [tab, setTab] = useState<"roles" | "groupes">("roles");
  const [detail, setDetail] = useState<PermissionItem | null>(null);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Matrice des permissions</h1>
          <p className="muted">
            Vue en lecture seule des permissions atomiques : ce que chaque rôle détient et ce que chaque groupe
            spécialisé accorde. L'affichage est informatif ; le serveur reste la seule barrière de sécurité.
          </p>
        </div>
      </header>

      {catalogue.error && <p className="banner banner-error">{catalogue.error}</p>}
      {catalogue.loading && <p className="muted">Chargement de la matrice...</p>}

      {data && (
        <>
          <Tabs
            tabs={[
              { id: "roles", label: "Permissions par rôle" },
              { id: "groupes", label: `Groupes spécialisés (${data.groupes_specialises.length})` },
            ]}
            active={tab}
            onChange={(id) => setTab(id as "roles" | "groupes")}
          />
          {tab === "roles" && (
          <>
          <div className="table-wrap">
            <table className="table table-sticky">
              <thead>
                <tr>
                  <th>Permission</th>
                  <th>Risque</th>
                  {roles.map((role) => (
                    <th key={role} style={{ textAlign: "center" }}>
                      {ROLE_LABELS[role] ?? role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagination.page.map((domaine) => {
                  const perms = data.permissions.filter((p) => p.domaine === domaine);
                  return [
                    <tr key={`d-${domaine}`}>
                      <td colSpan={2 + roles.length} className="nav-group-title" style={{ paddingTop: 12 }}>
                        {domaine}
                      </td>
                    </tr>,
                    ...perms.map((p) => (
                      <tr key={p.cle}>
                        <td>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                            <span>{p.libelle}</span>
                            <button type="button" className="link" onClick={() => setDetail(p)} aria-label={`Documentation de la permission ${p.libelle}`}>
                              Détails
                            </button>
                          </div>
                          {p.description && <div className="muted small" style={{ maxWidth: 420, lineHeight: 1.35 }}>{p.description}</div>}
                          {p.limite && <div className="small" style={{ maxWidth: 420, color: "#c0392b", lineHeight: 1.35 }}>Ne permet pas : {p.limite}</div>}
                          <div className="mono muted small">{p.cle}</div>
                        </td>
                        <td>
                          <RiskBadge risque={p.risque} />
                        </td>
                        {roles.map((role) => (
                          <td key={role} style={{ textAlign: "center" }}>
                            {heldByRole.get(role)?.has(p.cle) ? (
                              <span aria-label="accordé" title="Accordé" style={{ color: "#2a4fad", fontWeight: 700 }}>
                                ✓
                              </span>
                            ) : (
                              <span aria-label="non accordé" className="muted">
                                ·
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    )),
                  ];
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={pagination.numero}
            pages={pagination.pages}
            total={pagination.total}
            taille={pagination.taille}
            onPage={pagination.setNumero}
            onTaille={pagination.setTaille}
            libelle="domaines"
          />
          </>
          )}

          {tab === "groupes" && (
          <>
          {data.groupes_specialises.length === 0 && <p className="muted">Aucun groupe spécialisé défini.</p>}
          <div className="table-wrap">
            <table className="table table-sticky">
              <thead>
                <tr>
                  <th>Groupe</th>
                  <th>État</th>
                  <th>Permissions accordées</th>
                </tr>
              </thead>
              <tbody>
                {data.groupes_specialises.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div>{g.libelle}</div>
                      {g.description && <div className="muted small">{g.description}</div>}
                      <div className="mono muted small">{g.cle}</div>
                    </td>
                    <td>
                      <span className={`badge ${g.actif ? "badge-ok" : "badge-mut"}`}>{g.actif ? "Actif" : "Retiré"}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {g.permissions.map((cle) => {
                          const p = parCle.get(cle);
                          return p ? (
                            <button
                              key={cle}
                              type="button"
                              className="mono small"
                              style={{ background: "#eef1f8", border: "none", borderRadius: 4, padding: "1px 6px", cursor: "pointer", color: "inherit" }}
                              onClick={() => setDetail(p)}
                              aria-label={`Documentation de la permission ${p.libelle}`}
                            >
                              {cle}
                            </button>
                          ) : (
                            <span key={cle} className="mono small" style={{ background: "#eef1f8", borderRadius: 4, padding: "1px 6px" }}>
                              {cle}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
          )}
        </>
      )}

      <PermissionDrawer permission={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
