import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  type GroupeAcces,
  type MembreGroupes,
  type MembreProfile,
  type Utilisateur,
  ajouterMembreGroupe,
  getGroupes,
  getMembreGroupes,
  getMembres,
  getUtilisateurs,
  retirerMembreGroupe,
  updateUtilisateur,
} from "../api.js";
import { useResource } from "../useResource.js";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super-administration",
  admin: "Administration",
  gestionnaire: "Gestion des membres",
  controleur: "Contrôle",
  direction: "Direction",
  membre: "Membre (aucun accès plateforme)",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

interface CibleMembre {
  id: string;
  nom: string;
}

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

function RechercheMembre({
  token,
  onChoisir,
}: {
  token: string;
  onChoisir: (m: CibleMembre) => void;
}): JSX.Element {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<MembreProfile[]>([]);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function chercher(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (q.trim().length < 2) {
      setErreur("Saisir au moins deux caractères.");
      return;
    }
    setBusy(true);
    setErreur(null);
    try {
      const rows = await getMembres(token, { q: q.trim(), limit: 10 });
      setResultats(rows);
      if (rows.length === 0) setErreur("Aucun membre trouvé.");
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="form-card">
      <h2 className="section-title">Accorder un accès à un membre</h2>
      <p className="muted small">
        Rechercher un membre par nom ou matricule, puis l&apos;ajouter au groupe correspondant à l&apos;accès voulu.
      </p>
      <form className="form-inline" onSubmit={chercher}>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom, prénom ou matricule"
        />
        <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
          {busy ? "Recherche..." : "Rechercher"}
        </button>
      </form>
      {erreur && <p className="banner banner-error">{erreur}</p>}
      {resultats.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Matricule</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {resultats.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.nom_affiche ?? m.nom_affichage ?? `${m.nom ?? ""} ${m.prenoms ?? ""}`.trim()}</strong>
                  </td>
                  <td className="muted small">{m.matricule}</td>
                  <td>
                    <button
                      type="button"
                      className="link"
                      onClick={() =>
                        onChoisir({
                          id: m.id,
                          nom: m.nom_affiche ?? m.nom_affichage ?? `${m.nom ?? ""} ${m.prenoms ?? ""}`.trim(),
                        })
                      }
                    >
                      Gérer les groupes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EditeurGroupes({
  token,
  membre,
  onClose,
  onChanged,
}: {
  token: string;
  membre: CibleMembre;
  onClose: () => void;
  onChanged: () => void;
}): JSX.Element {
  const [catalogue, setCatalogue] = useState<GroupeAcces[]>([]);
  const [etat, setEtat] = useState<MembreGroupes | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [motDePasse, setMotDePasse] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const [cat, membreGroupes] = await Promise.all([
        getGroupes(token),
        getMembreGroupes(token, membre.id),
      ]);
      setCatalogue(cat);
      setEtat(membreGroupes);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau");
    }
  }, [token, membre.id]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const membreDans = (groupeId: string): boolean => (etat?.groupes ?? []).some((g) => g.id === groupeId);

  async function basculer(groupe: GroupeAcces): Promise<void> {
    setBusy(groupe.id);
    setErreur(null);
    try {
      if (membreDans(groupe.id)) {
        await retirerMembreGroupe(token, membre.id, groupe.id);
      } else {
        const res = await ajouterMembreGroupe(token, membre.id, groupe.id);
        if (res.mot_de_passe_temporaire) setMotDePasse(res.mot_de_passe_temporaire);
      }
      await charger();
      onChanged();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="form-card editor-panel">
      <div className="page-head">
        <h2 className="section-title">Groupes de {membre.nom}</h2>
        <button type="button" className="link" onClick={onClose}>Fermer</button>
      </div>
      {erreur && <p className="banner banner-error">{erreur}</p>}
      <p className="muted small">
        Rôle effectif actuel : <strong>{roleLabel(etat?.effective_role ?? "membre")}</strong>
      </p>
      {motDePasse && (
        <p className="banner banner-ok">
          Compte d&apos;accès créé. Mot de passe temporaire à transmettre une seule fois : <strong>{motDePasse}</strong>
        </p>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Groupe</th>
              <th>Accès</th>
              <th>Accordé</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {catalogue.map((g) => {
              const actif = membreDans(g.id);
              const detail = (etat?.groupes ?? []).find((x) => x.id === g.id);
              return (
                <tr key={g.id}>
                  <td>
                    <div className="event-main">
                      <strong>{g.libelle}</strong>
                      <span className="muted small">{roleLabel(g.role_accorde)}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${actif ? "badge-ok" : "badge-warn"}`}>
                      {actif ? "membre du groupe" : "hors du groupe"}
                    </span>
                  </td>
                  <td className="muted small">
                    {actif && detail?.ajoute_le
                      ? `${detail.ajoute_par_nom ?? "?"}, le ${new Date(detail.ajoute_le).toLocaleDateString("fr-FR")}`
                      : "-"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={actif ? "btn btn-ghost btn-inline" : "btn btn-primary btn-inline"}
                      disabled={busy === g.id}
                      onClick={() => void basculer(g)}
                    >
                      {busy === g.id ? "..." : actif ? "Retirer" : "Ajouter"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
