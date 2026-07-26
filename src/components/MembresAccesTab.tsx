import { useMemo, useState } from "react";

import { ApiError, type Utilisateur, getUtilisateurs, updateUtilisateur } from "../api.js";
import { useResource } from "../useResource.js";
import { EditeurGroupes } from "./EditeurGroupes.js";
import { FicheGouvernance } from "./FicheGouvernance.js";
import { RechercheMembre } from "./RechercheMembre.js";
import { type CibleMembre, roleLabel } from "./utilisateursShared.js";
import { usePagination } from "../usePagination.js";
import { Pagination } from "./Pagination.js";

/**
 * "Membres avec accès plateforme" tab: the accounts that hold access beyond the
 * member space, with search placed on top for long lists, quick account toggle,
 * and the per-member group editor. The effective role is derived from the member's
 * groups; the server remains the single enforcement point.
 */
export function MembresAccesTab({ token }: { token: string }): JSX.Element {
  const users = useResource(() => getUtilisateurs(token), [token]);
  const [cible, setCible] = useState<CibleMembre | null>(null);
  const [fiche, setFiche] = useState<CibleMembre | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);

  function guardToggle(u: Utilisateur): void {
    setError(null);
    updateUtilisateur(token, u.id, { actif: !u.actif })
      .then(() => users.reload())
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Erreur réseau"));
  }

  const comptesPlateforme = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (users.data ?? [])
      // Platform access exists either through an elevated role OR through an active
      // GLOBAL group membership (a permission-mode group keeps the role 'membre'
      // while granting real platform permissions): both must appear in this review.
      .filter((u) => u.role !== "membre" || (u.groupes_globaux ?? 0) > 0)
      .filter((u) => !term || (u.membre_nom ?? "").toLowerCase().includes(term) || u.email.toLowerCase().includes(term) || u.role.toLowerCase().includes(term));
  }, [users.data, q]);

  const pagination = usePagination(comptesPlateforme, 10);

  return (
    <div>
      <header className="page-head">
        <div>
          <h2 className="section-title">Membres avec un accès plateforme</h2>
          <p className="muted small">
            Les comptes qui disposent d'un accès au-delà de l'espace membre : rôle plateforme élevé ou groupe de
            permissions global. Cherchez ci-dessous, ou ajoutez un accès à un membre plus bas.
          </p>
        </div>
      </header>

      {error && <p className="banner banner-error">{error}</p>}

      <div className="form-inline" style={{ margin: "8px 0 12px" }}>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher par nom, e-mail ou rôle" />
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Personne</th>
              <th>Rôle effectif</th>
              <th>État du compte</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.loading && <tr><td colSpan={4} className="muted">Chargement...</td></tr>}
            {!users.loading && comptesPlateforme.length === 0 && (
              <tr><td colSpan={4} className="muted">Aucun membre n'a d'accès plateforme.</td></tr>
            )}
            {pagination.page.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="event-main">
                    <strong>{u.membre_nom ?? u.email}</strong>
                    <span className="muted small">{u.email}</span>
                  </div>
                </td>
                <td>
                  {u.role !== "membre" ? (
                    <span className="badge badge-ok">{roleLabel(u.role)}</span>
                  ) : (
                    // Cached role 'membre' with active global memberships: the access
                    // comes from a permission-mode group, not a platform role.
                    <span className="badge badge-ok" title="Permissions accordées par un groupe de permissions global">
                      Groupe de permissions
                    </span>
                  )}
                </td>
                <td>
                  <span className={`badge ${u.actif ? "badge-ok" : "badge-warn"}`}>{u.actif ? "actif" : "désactivé"}</span>
                </td>
                <td className="row-actions">
                  {u.membre_id ? (
                    <>
                      <button
                        type="button"
                        className="link"
                        onClick={() => setFiche({ id: u.membre_id as string, nom: u.membre_nom ?? u.email })}
                      >
                        Fiche gouvernance
                      </button>
                      <button
                        type="button"
                        className="link"
                        onClick={() => setCible({ id: u.membre_id as string, nom: u.membre_nom ?? u.email })}
                      >
                        Gérer les groupes
                      </button>
                    </>
                  ) : (
                    <span className="muted small">compte sans membre lié</span>
                  )}
                  <button type="button" className="link" onClick={() => guardToggle(u)}>
                    {u.actif ? "Désactiver" : "Réactiver"}
                  </button>
                </td>
              </tr>
            ))}
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
        libelle="comptes"
      />

      <RechercheMembre token={token} onChoisir={setCible} />

      {cible && (
        <EditeurGroupes
          token={token}
          membre={cible}
          onClose={() => setCible(null)}
          onChanged={() => users.reload()}
        />
      )}

      {fiche && (
        <FicheGouvernance token={token} membre={fiche} onClose={() => setFiche(null)} />
      )}
    </div>
  );
}
