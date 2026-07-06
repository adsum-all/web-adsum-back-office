import { useState } from "react";

import { ApiError, type Utilisateur, getGroupes, getUtilisateurs, updateUtilisateur } from "../api.js";
import { useResource } from "../useResource.js";
import { EditeurGroupes } from "./EditeurGroupes.js";
import { RechercheMembre } from "./RechercheMembre.js";
import { type CibleMembre, roleLabel } from "./utilisateursShared.js";

export function Utilisateurs({ token }: { token: string }): JSX.Element {
  const users = useResource(() => getUtilisateurs(token), [token]);
  const groupes = useResource(() => getGroupes(token), [token]);
  const [cible, setCible] = useState<CibleMembre | null>(null);
  const [error, setError] = useState<string | null>(null);

  function guardToggle(u: Utilisateur): void {
    setError(null);
    updateUtilisateur(token, u.id, { actif: !u.actif })
      .then(() => users.reload())
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Erreur réseau"));
  }

  const comptesPlateforme = (users.data ?? []).filter((u) => u.role !== "membre");

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Accès &amp; groupes</h1>
          <p className="muted">
            Chaque personne est d&apos;abord un membre. L&apos;accès au back-office, à la direction ou au
            pilotage n&apos;est pas son identité : c&apos;est un droit accordé en l&apos;ajoutant à un groupe.
            Retirer un membre d&apos;un groupe lui enlève l&apos;accès sans jamais casser son compte membre.
          </p>
        </div>
      </header>

      {error && <p className="banner banner-error">{error}</p>}

      <section className="form-card">
        <h2 className="section-title">Groupes d&apos;accès</h2>
        <p className="muted small">
          Le catalogue des groupes. Chaque groupe accorde exactement un rôle plateforme. Refus par défaut :
          un membre sans groupe n&apos;a aucun accès.
        </p>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Groupe</th>
                <th>Rôle accordé</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {groupes.loading && (
                <tr>
                  <td colSpan={3} className="muted">Chargement...</td>
                </tr>
              )}
              {(groupes.data ?? []).map((g) => (
                <tr key={g.id}>
                  <td><strong>{g.libelle}</strong></td>
                  <td><span className="badge badge-ok">{roleLabel(g.role_accorde)}</span></td>
                  <td className="muted small">{g.description ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="form-card">
        <h2 className="section-title">Membres avec un accès plateforme</h2>
        <p className="muted small">
          Les comptes qui disposent aujourd&apos;hui d&apos;un accès au-delà de l&apos;espace membre. Le rôle
          affiché est calculé à partir des groupes du membre.
        </p>
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
              {users.loading && (
                <tr>
                  <td colSpan={4} className="muted">Chargement...</td>
                </tr>
              )}
              {!users.loading && comptesPlateforme.length === 0 && (
                <tr>
                  <td colSpan={4} className="muted">Aucun membre n&apos;a d&apos;accès plateforme.</td>
                </tr>
              )}
              {comptesPlateforme.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className="event-main">
                      <strong>{u.membre_nom ?? u.email}</strong>
                      <span className="muted small">{u.email}</span>
                    </div>
                  </td>
                  <td><span className="badge badge-ok">{roleLabel(u.role)}</span></td>
                  <td>
                    <span className={`badge ${u.actif ? "badge-ok" : "badge-warn"}`}>
                      {u.actif ? "actif" : "désactivé"}
                    </span>
                  </td>
                  <td className="row-actions">
                    {u.membre_id ? (
                      <button
                        type="button"
                        className="link"
                        onClick={() => setCible({ id: u.membre_id as string, nom: u.membre_nom ?? u.email })}
                      >
                        Gérer les groupes
                      </button>
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
      </section>

      <RechercheMembre token={token} onChoisir={setCible} />

      {cible && (
        <EditeurGroupes
          token={token}
          membre={cible}
          onClose={() => setCible(null)}
          onChanged={() => users.reload()}
        />
      )}
    </div>
  );
}
