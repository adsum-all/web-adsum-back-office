import { useCallback, useEffect, useState } from "react";

import {
  type AccesEffectif,
  ApiError,
  type CatalogueRole,
  type GroupeAcces,
  type MembreGroupes,
  type PerimetresDisponibles,
  type UniteOrg,
  ajouterMembreGroupe,
  getAccesEffectif,
  getCatalogueAcces,
  getGroupes,
  getMembreGroupes,
  getPerimetresDisponibles,
  retirerMembreGroupe,
} from "../api.js";
import { type CibleMembre, GLOBAL_ONLY_ROLES, RisqueBadge, porteeLabel, roleLabel } from "./utilisateursShared.js";

export function EditeurGroupes({
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
  // A permissions group only grants named permissions, never a platform role, so it
  // can only be granted globally: never propose a scoped perimetre for it.
  const scopable = groupeChoisi
    ? groupeChoisi.mode !== "permissions" && !GLOBAL_ONLY_ROLES.has(groupeChoisi.role_accorde)
    : false;
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
              <tr key={a.appartenance_id} style={{ opacity: a.groupe_actif === false ? 0.6 : 1 }}>
                <td>
                  <div className="event-main">
                    <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <strong>{a.libelle}</strong>
                      {a.groupe_actif === false && (
                        <span className="badge badge-warn" title="Ce groupe est désactivé : cette appartenance n'accorde plus rien.">
                          Groupe désactivé
                        </span>
                      )}
                    </span>
                    <span className="muted small">
                      {a.mode === "permissions" ? "Groupe de permissions" : roleLabel(a.role_accorde)}
                    </span>
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
              <option key={g.id} value={g.id}>
                {g.libelle} ({g.mode === "permissions" ? `${g.permissions.length} permission${g.permissions.length > 1 ? "s" : ""}` : `rôle : ${roleLabel(g.role_accorde)}`})
              </option>
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
          {groupeChoisi.mode === "permissions" ? (
            <span className="muted small">
              Groupe de permissions ({groupeChoisi.permissions.length} permission{groupeChoisi.permissions.length > 1 ? "s" : ""})
            </span>
          ) : (
            <>
              <span className="muted small">Ce groupe accorde le rôle {roleLabel(groupeChoisi.role_accorde)}</span>
              <RisqueBadge risque={risqueDeGroupe(groupeChoisi)} />
            </>
          )}
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
