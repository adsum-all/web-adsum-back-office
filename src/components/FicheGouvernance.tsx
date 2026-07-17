import { useEffect } from "react";

import {
  ApiError,
  type MembreProfile,
  getAccesEffectif,
  getMembre,
  getMembreApplications,
  getMembreGroupes,
} from "../api.js";
import { civilName, formatDate } from "../format.js";
import { useResource } from "../useResource.js";
import { type CibleMembre, RisqueBadge, porteeLabel, roleLabel } from "./utilisateursShared.js";

// Human status labels and colours, aligned with the member header chip.
const STATUT_LABELS: Record<string, string> = {
  actif: "Actif",
  inactif: "Inactif",
  desactive: "Désactivé",
  suspendu: "Suspendu",
  archive: "Archivé",
  incomplet: "Incomplet",
  refuse: "Refusé",
  en_attente: "En attente",
  correction_demandee: "Correction demandée",
  non_verifie: "Non vérifié",
};

function statutBadge(statut: string): string {
  if (statut === "actif") return "badge-ok";
  if (statut === "suspendu" || statut === "refuse") return "badge-bad";
  return "badge-mut";
}

const SECTION_STYLE = { display: "flex", flexDirection: "column", gap: 8 } as const;
const TITLE_STYLE = { fontSize: 15, margin: 0 } as const;

/**
 * Consolidated governance sheet for one member, opened from the access screens.
 * Read-only single view of everything access-related: identity, application
 * visibility (level 1), group memberships (level 2), effective permissions with
 * their capabilities, and where to find the audit trail. Granting and revoking
 * stay in the dedicated editors; the server remains the single enforcement point
 * (every endpoint used here requires acces.administrer, except the identity
 * endpoint which requires membres.gerer and degrades gracefully on 403).
 */
export function FicheGouvernance({
  token,
  membre,
  onClose,
}: {
  token: string;
  membre: CibleMembre;
  onClose: () => void;
}): JSX.Element {
  // Identity needs membres.gerer while the rest of the sheet needs acces.administrer:
  // a 403 here is a legitimate configuration, not an error, so it resolves to null
  // and the section explains itself instead of showing a red banner.
  const identite = useResource<MembreProfile | null>(
    () =>
      getMembre(token, membre.id).catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403) return null;
        throw e;
      }),
    [token, membre.id],
  );
  const applications = useResource(() => getMembreApplications(token, membre.id), [token, membre.id]);
  const groupes = useResource(() => getMembreGroupes(token, membre.id), [token, membre.id]);
  const effectif = useResource(() => getAccesEffectif(token, membre.id), [token, membre.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const m = identite.data;
  const eff = effectif.data;

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-label={`Fiche gouvernance de ${membre.nom}`}>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer-panel" style={{ width: "min(560px, 96vw)" }}>
        <header className="drawer-head">
          <div>
            <p className="nav-group-title" style={{ margin: 0 }}>Fiche gouvernance</p>
            <h2 className="drawer-title">{m ? civilName(m, membre.nom) : membre.nom}</h2>
          </div>
          <button type="button" className="drawer-close" aria-label="Fermer la fiche" onClick={onClose}>
            &times;
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
          <section style={SECTION_STYLE}>
            <h3 className="section-title" style={TITLE_STYLE}>Identité</h3>
            {identite.loading && <p className="muted small">Chargement...</p>}
            {identite.error && <p className="banner banner-error">{identite.error}</p>}
            {!identite.loading && !identite.error && !m && (
              <p className="muted small">
                Identité détaillée indisponible : la consultation du profil requiert la permission{" "}
                <span className="mono">membres.gerer</span>.
              </p>
            )}
            {m && (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className="mono muted small">{m.matricule}</span>
                <span className={`badge ${statutBadge(m.statut)}`}>{STATUT_LABELS[m.statut] ?? m.statut}</span>
                <span className="muted small">{m.email}</span>
              </div>
            )}
          </section>

          <section style={SECTION_STYLE}>
            <h3 className="section-title" style={TITLE_STYLE}>Visibilité et accès applicatif</h3>
            <p className="muted small" style={{ margin: 0 }}>
              Ce que le membre voit dans « Mes applications » (niveau 1). Lecture seule : accorder ou révoquer se fait
              depuis la fiche du membre ou les onglets par application.
            </p>
            {applications.loading && <p className="muted small">Chargement...</p>}
            {applications.error && <p className="banner banner-error">{applications.error}</p>}
            {!applications.loading && !applications.error && (applications.data ?? []).length === 0 && (
              <p className="muted small">Aucune application au catalogue.</p>
            )}
            <ul className="list" style={{ margin: 0 }}>
              {(applications.data ?? []).map((a) => (
                <li key={a.code} className="list-row" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ flex: 1, minWidth: 140 }}>{a.nom}</strong>
                  {a.est_defaut ? (
                    // A default application (the member space) is visible to EVERY member
                    // automatically: it can never be "not visible" and is not revocable.
                    <span className="badge badge-ok" title="Visibilité automatique pour tous les membres">
                      Visible par défaut
                    </span>
                  ) : (
                    <span className={`badge ${a.acces_actif ? "badge-ok" : "badge-mut"}`}>
                      {a.acces_actif ? "Visible" : "Non visible"}
                    </span>
                  )}
                  {!a.actif && <span className="badge badge-warn">Application désactivée</span>}
                </li>
              ))}
            </ul>
          </section>

          <section style={SECTION_STYLE}>
            <h3 className="section-title" style={TITLE_STYLE}>Groupes</h3>
            {groupes.loading && <p className="muted small">Chargement...</p>}
            {groupes.error && <p className="banner banner-error">{groupes.error}</p>}
            {!groupes.loading && !groupes.error && (groupes.data?.groupes ?? []).length === 0 && (
              <p className="muted small">Aucun groupe d'accès : ce membre ne dispose que de l'espace membre.</p>
            )}
            {(groupes.data?.groupes ?? []).length > 0 && (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Groupe</th>
                      <th>Rôle accordé</th>
                      <th>Portée</th>
                      <th>Ajouté le</th>
                      <th>Ajouté par</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(groupes.data?.groupes ?? []).map((g) => (
                      <tr key={g.appartenance_id}>
                        <td>{g.libelle}</td>
                        <td>{roleLabel(g.role_accorde)}</td>
                        <td>{porteeLabel(g.portee_type, g.portee_libelle)}</td>
                        <td className="muted small">{formatDate(g.ajoute_le)}</td>
                        <td className="muted small">{g.ajoute_par_nom ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={SECTION_STYLE}>
            <h3 className="section-title" style={TITLE_STYLE}>Permissions effectives</h3>
            {effectif.loading && <p className="muted small">Chargement...</p>}
            {effectif.error && <p className="banner banner-error">{effectif.error}</p>}
            {eff && (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="badge badge-ok">{roleLabel(eff.role_global_effectif)}</span>
                  <RisqueBadge risque={eff.risque_global} />
                </div>
                {eff.acces.length === 0 && (
                  <p className="muted small">Aucun accès au-delà de l'espace membre.</p>
                )}
                {eff.acces.map((a, i) => (
                  <div key={`${a.role}-${a.portee_type}-${i}`} className="list-row" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <strong>{a.role_libelle}</strong>
                      <span className="muted small">sur {a.portee_texte}</span>
                      <RisqueBadge risque={a.risque} />
                    </div>
                    <details>
                      <summary className="muted small" style={{ cursor: "pointer" }}>
                        {a.capabilities.length} {a.capabilities.length > 1 ? "capacités" : "capacité"}
                      </summary>
                      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                        {a.capabilities.map((c) => (
                          <li key={c.cle} className="small">
                            {c.libelle} <span className="mono muted">{c.cle}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </div>
                ))}
                {eff.avertissements.map((w) => (
                  <p key={w} className="banner banner-info small" style={{ margin: 0 }}>{w}</p>
                ))}
              </>
            )}
          </section>

          {eff?.role_global_effectif === "super_admin" && (
            <section
              style={{
                ...SECTION_STYLE,
                background: "rgba(201, 42, 42, 0.06)",
                border: "1px solid rgba(201, 42, 42, 0.28)",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <h3 className="section-title" style={{ ...TITLE_STYLE, color: "#c0392b" }}>Super-admin membre</h3>
              <p style={{ margin: 0, lineHeight: 1.5 }} className="small">
                Ce membre détient la super-administration, avec une portée sur toute la base. L'attribution comme le
                retrait de ce pouvoir se font exclusivement par les groupes d'accès, jamais ici.
              </p>
            </section>
          )}

          <section style={SECTION_STYLE}>
            <h3 className="section-title" style={TITLE_STYLE}>Historique</h3>
            <p className="muted small" style={{ margin: 0 }}>
              Le journal d'audit ne propose pas encore de filtre par membre. Les événements de gouvernance de ce membre
              (ajout ou retrait de groupe, modification d'accès applicatif) sont consultables parmi les entrées
              récentes du <a className="link" href="#/audit">Journal d'audit</a>, réservé à la permission{" "}
              <span className="mono">audit.administrer</span>.
            </p>
          </section>
        </div>
      </aside>
    </div>
  );
}
