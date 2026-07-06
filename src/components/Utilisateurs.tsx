import { useCallback, useEffect, useState } from "react";

import {
  type AccesEffectif,
  ApiError,
  type CatalogueRole,
  type GroupeAcces,
  type MembreGroupes,
  type MembreProfile,
  type PerimetresDisponibles,
  type UniteOrg,
  type Utilisateur,
  ajouterMembreGroupe,
  getAccesEffectif,
  getCatalogueAcces,
  getGroupes,
  getMembreGroupes,
  getMembres,
  getPerimetresDisponibles,
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

// Roles that only make sense globally: their groups cannot be scoped to a unit.
const GLOBAL_ONLY_ROLES = new Set(["super_admin", "admin"]);

const PORTEE_LABELS: Record<string, string> = {
  global: "Global (toute la base)",
  coordination: "Coordination",
  intendance: "Intendance",
  commission: "Commission / mission",
  tribu: "Tribu",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

function porteeLabel(type: string, libelle: string | null): string {
  if (type === "global") return "Global";
  return `${PORTEE_LABELS[type] ?? type}${libelle ? ` : ${libelle}` : ""}`;
}

const RISQUE_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  faible: { bg: "#e6f6ee", fg: "#1f9d6b", label: "risque faible" },
  moyen: { bg: "#fff5e6", fg: "#b8791b", label: "risque moyen" },
  eleve: { bg: "#fdeef0", fg: "#c0394a", label: "risque élevé" },
  critique: { bg: "#fbe9ea", fg: "#a01925", label: "risque critique" },
};

const RISQUE_FALLBACK = { bg: "#fff5e6", fg: "#b8791b", label: "risque moyen" };

function RisqueBadge({ risque }: { risque: string }): JSX.Element {
  const s = RISQUE_STYLE[risque] ?? RISQUE_FALLBACK;
  return (
    <span style={{ background: s.bg, color: s.fg, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
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
  const [perimetres, setPerimetres] = useState<PerimetresDisponibles | null>(null);
  const [etat, setEtat] = useState<MembreGroupes | null>(null);
  const [roleCatalogue, setRoleCatalogue] = useState<CatalogueRole[]>([]);
  const [effectif, setEffectif] = useState<AccesEffectif | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [motDePasse, setMotDePasse] = useState<string | null>(null);

  // Formulaire d'ajout
  const [groupeId, setGroupeId] = useState("");
  const [porteeType, setPorteeType] = useState("global");
  const [porteeId, setPorteeId] = useState("");

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const [cat, per, membreGroupes, roles, eff] = await Promise.all([
        getGroupes(token),
        getPerimetresDisponibles(token),
        getMembreGroupes(token, membre.id),
        getCatalogueAcces(token),
        getAccesEffectif(token, membre.id),
      ]);
      setCatalogue(cat);
      setPerimetres(per);
      setEtat(membreGroupes);
      setRoleCatalogue(roles.roles);
      setEffectif(eff);
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau");
    }
  }, [token, membre.id]);

  function risqueDeGroupe(g: GroupeAcces): string {
    return roleCatalogue.find((r) => r.role === g.role_accorde)?.risque ?? "moyen";
  }

  useEffect(() => {
    void charger();
  }, [charger]);

  const groupeChoisi = catalogue.find((g) => g.id === groupeId);
  const scopable = groupeChoisi ? !GLOBAL_ONLY_ROLES.has(groupeChoisi.role_accorde) : false;
  const unites: UniteOrg[] =
    perimetres && porteeType !== "global" ? (perimetres[porteeType as keyof PerimetresDisponibles] ?? []) : [];

  async function ajouter(): Promise<void> {
    if (!groupeId) {
      setErreur("Choisissez un groupe.");
      return;
    }
    if (scopable && porteeType !== "global" && !porteeId) {
      setErreur("Choisissez l'unité du périmètre.");
      return;
    }
    setBusy("add");
    setErreur(null);
    try {
      const res = await ajouterMembreGroupe(token, membre.id, {
        groupe_id: groupeId,
        portee_type: scopable ? porteeType : "global",
        portee_id: scopable && porteeType !== "global" ? porteeId : null,
      });
      if (res.mot_de_passe_temporaire) setMotDePasse(res.mot_de_passe_temporaire);
      setGroupeId("");
      setPorteeType("global");
      setPorteeId("");
      await charger();
      onChanged();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(null);
    }
  }

  async function retirer(appartenanceId: string): Promise<void> {
    setBusy(appartenanceId);
    setErreur(null);
    try {
      await retirerMembreGroupe(token, membre.id, appartenanceId);
      await charger();
      onChanged();
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(null);
    }
  }

  const appartenances = etat?.groupes ?? [];

  return (
    <section className="form-card editor-panel">
      <div className="page-head">
        <h2 className="section-title">Accès de {membre.nom}</h2>
        <button type="button" className="link" onClick={onClose}>Fermer</button>
      </div>
      {erreur && <p className="banner banner-error">{erreur}</p>}
      <p className="muted small">
        Rôle global effectif : <strong>{roleLabel(etat?.effective_role ?? "membre")}</strong>. Un accès scopé
        (coordination, intendance, commission, tribu) ne donne pas le back-office global : il ouvre le pilotage
        borné à cette unité uniquement.
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
              <th>Périmètre</th>
              <th>Accordé</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {appartenances.length === 0 && (
              <tr>
                <td colSpan={4} className="muted">Aucun accès. Ce membre n&apos;a que son espace membre.</td>
              </tr>
            )}
            {appartenances.map((a) => (
              <tr key={a.appartenance_id}>
                <td>
                  <div className="event-main">
                    <strong>{a.libelle}</strong>
                    <span className="muted small">{roleLabel(a.role_accorde)}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${a.portee_type === "global" ? "badge-ok" : "badge-warn"}`}>
                    {porteeLabel(a.portee_type, a.portee_libelle)}
                  </span>
                </td>
                <td className="muted small">
                  {a.ajoute_le ? `${a.ajoute_par_nom ?? "?"}, le ${new Date(a.ajoute_le).toLocaleDateString("fr-FR")}` : "-"}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-ghost btn-inline"
                    disabled={busy === a.appartenance_id}
                    onClick={() => void retirer(a.appartenance_id)}
                  >
                    {busy === a.appartenance_id ? "..." : "Retirer"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {effectif && (
        <section style={{ marginTop: "1rem" }}>
          <h3 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            Revue d&apos;accès effectif <RisqueBadge risque={effectif.risque_global} />
          </h3>
          {effectif.avertissements.map((w) => (
            <p key={w} style={{ marginTop: 6, background: "#fff5e6", color: "#8a5a12", border: "1px solid #f0d9a8", borderRadius: 10, padding: "10px 12px", fontSize: 13 }}>
              {w}
            </p>
          ))}
          {effectif.acces.length === 0 && (
            <p className="muted small">Aucun accès plateforme. Cette personne ne voit que son espace membre.</p>
          )}
          {effectif.acces.map((a, i) => (
            <details key={`${a.role}-${a.portee_type}-${i}`} className="form-card" style={{ marginTop: 8, padding: "0.6rem 0.9rem" }}>
              <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <strong>{a.role_libelle}</strong>
                <span className={`badge ${a.portee_type === "global" ? "badge-ok" : "badge-warn"}`}>{a.portee_texte}</span>
                <RisqueBadge risque={a.risque} />
                <span className="muted small">({a.capabilities.length} droits)</span>
              </summary>
              <ul className="list" style={{ marginTop: 8 }}>
                {a.capabilities.map((c) => (
                  <li key={c.cle} style={{ padding: "4px 0" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <strong>{c.libelle}</strong> <RisqueBadge risque={c.risque} />
                    </span>
                    <div className="muted small">{c.description}</div>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </section>
      )}

      <h3 className="section-title" style={{ marginTop: "1rem" }}>Accorder un accès</h3>
      <div className="form-grid">
        <label>
          <span>Groupe</span>
          <select value={groupeId} onChange={(e) => { setGroupeId(e.target.value); setPorteeType("global"); setPorteeId(""); }}>
            <option value="">Choisir un groupe...</option>
            {catalogue.map((g) => (
              <option key={g.id} value={g.id}>{g.libelle} ({roleLabel(g.role_accorde)})</option>
            ))}
          </select>
        </label>
        {scopable && (
          <label>
            <span>Périmètre</span>
            <select value={porteeType} onChange={(e) => { setPorteeType(e.target.value); setPorteeId(""); }}>
              <option value="global">Global (toute la base)</option>
              <option value="coordination">Coordination</option>
              <option value="intendance">Intendance</option>
              <option value="commission">Commission / mission</option>
              <option value="tribu">Tribu</option>
            </select>
          </label>
        )}
        {scopable && porteeType !== "global" && (
          <label>
            <span>Unité</span>
            <select value={porteeId} onChange={(e) => setPorteeId(e.target.value)}>
              <option value="">Choisir...</option>
              {unites.map((u) => (
                <option key={u.id} value={u.id}>{u.nom}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {groupeChoisi && (
        <p style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <span className="muted small">Ce groupe accorde le rôle {roleLabel(groupeChoisi.role_accorde)}</span>
          <RisqueBadge risque={risqueDeGroupe(groupeChoisi)} />
          {!scopable && <span className="muted small">, uniquement en global.</span>}
          {scopable && porteeType === "global" && <span className="muted small">, ici en GLOBAL (toute la base).</span>}
          {scopable && porteeType !== "global" && <span className="muted small">, borné à un périmètre (hermétique).</span>}
        </p>
      )}
      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-inline" disabled={busy === "add" || !groupeId} onClick={() => void ajouter()}>
          {busy === "add" ? "Ajout..." : "+ Accorder"}
        </button>
      </div>
    </section>
  );
}
