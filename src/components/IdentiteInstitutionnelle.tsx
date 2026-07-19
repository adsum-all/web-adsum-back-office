import { useEffect, useState } from "react";

import {
  type DateInstitInput,
  type DateInstitutionnelle,
  type IdentiteInstitutionnelle as Identite,
  createDateInstitutionnelle,
  deleteDateInstitutionnelle,
  getDatesInstitutionnelles,
  getIdentiteInstitutionnelle,
  setIdentiteInstitutionnelle,
  updateDateInstitutionnelle,
} from "../api.js";

const CHAMPS: { key: keyof Identite; label: string; placeholder?: string; type?: string }[] = [
  { key: "org_nom", label: "Nom de l'organisation" },
  { key: "org_nom_court", label: "Nom court" },
  { key: "org_site", label: "Site ou portail officiel", placeholder: "https://..." },
  { key: "org_fondation_date", label: "Date de fondation / anniversaire", type: "date" },
  { key: "org_saint_patron", label: "Saint patron" },
  { key: "org_saint_patron_date", label: "Date de la fête du saint patron", type: "date" },
  { key: "org_fuseau", label: "Fuseau de référence", placeholder: "Africa/Abidjan" },
  { key: "org_signature", label: "Signature institutionnelle" },
  { key: "org_contact", label: "Contact officiel" },
];

const MOIS = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function nouvelleDate(): DateInstitInput {
  return { nom: "", description: null, type: "commemoration", date_fixe: null, mois: null, jour: null, rappel_jours: 7, visibilite: "membre", actif: true };
}

/**
 * Parametres > Identite et dates institutionnelles.
 *
 * Everything organisation-specific (name, site, founding date, patron saint,
 * timezone, signature) is edited here and stored as data, never hardcoded, so
 * ADSUM can be redeployed for any association. A configurable list of institutional
 * dates (anniversary, patron feast, commemorations) can each carry a reminder.
 */
export function IdentiteInstitutionnelle({ token, canGerer }: Readonly<{ token: string; canGerer: boolean }>): JSX.Element {
  const [identite, setIdentite] = useState<Identite | null>(null);
  const [dates, setDates] = useState<DateInstitutionnelle[]>([]);
  const [edit, setEdit] = useState<{ id: string | null; data: DateInstitInput } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const charger = (): void => {
    void getIdentiteInstitutionnelle(token).then(setIdentite).catch((e) => setErr(String(e?.message ?? e)));
    void getDatesInstitutionnelles(token).then(setDates).catch(() => undefined);
  };
  useEffect(charger, [token]);

  async function run(fn: () => Promise<void>): Promise<void> {
    setBusy(true); setErr(null); setMsg(null);
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }

  if (!identite) {
    return (
      <div className="page">
        <header className="page-head"><h1>Identité et dates institutionnelles</h1></header>
        <section className="card"><p className="muted">{err ?? "Chargement..."}</p></section>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>Identité et dates institutionnelles</h1>
        <p className="muted">Ces valeurs sont configurables et réutilisables pour toute association. Rien n'est figé dans le code.</p>
      </header>
      {err && <div className="banner-error">{err}</div>}
      {msg && <div className="banner-info">{msg}</div>}

      <section className="card">
        <h2>Identité de l'organisation</h2>
        <div className="grid-2">
          {CHAMPS.map((c) => (
            <label key={c.key} className="field">
              <span>{c.label}</span>
              <input
                type={c.type ?? "text"}
                value={identite[c.key] ?? ""}
                placeholder={c.placeholder}
                disabled={!canGerer}
                onChange={(e) => setIdentite((id) => (id ? { ...id, [c.key]: e.target.value } : id))}
              />
            </label>
          ))}
        </div>
        {canGerer && (
          <div className="row-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void run(async () => { await setIdentiteInstitutionnelle(token, identite); setMsg("Identité enregistrée."); })}>Enregistrer l'identité</button>
          </div>
        )}
      </section>

      <section className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Dates institutionnelles</h2>
          {canGerer && <button type="button" className="btn btn-ghost btn-inline" onClick={() => setEdit({ id: null, data: nouvelleDate() })}>+ Ajouter une date</button>}
        </div>
        {dates.length === 0 ? (
          <p className="muted">Aucune date institutionnelle pour le moment.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Nom</th><th>Type</th><th>Quand</th><th>Rappel</th><th>Visibilité</th><th>Actif</th>{canGerer && <th></th>}</tr></thead>
              <tbody>
                {dates.map((d) => (
                  <tr key={d.id}>
                    <td>{d.nom}</td>
                    <td>{d.type}</td>
                    <td>{d.date_fixe ? new Date(d.date_fixe).toLocaleDateString("fr-FR") : d.jour && d.mois ? `${d.jour} ${MOIS[d.mois]}` : "-"}</td>
                    <td>{d.rappel_jours} j avant</td>
                    <td>{d.visibilite}</td>
                    <td>{d.actif ? "Oui" : "Non"}</td>
                    {canGerer && (
                      <td style={{ whiteSpace: "nowrap" }}>
                        <button type="button" className="btn btn-ghost btn-inline" onClick={() => setEdit({ id: d.id, data: { ...d } })}>Modifier</button>
                        <button type="button" className="btn btn-danger btn-inline" onClick={() => void run(async () => { if (window.confirm(`Supprimer « ${d.nom} » ?`)) { await deleteDateInstitutionnelle(token, d.id); charger(); } })}>Supprimer</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {edit && (
        <div className="drawer-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(15,20,35,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div className="card" style={{ width: "min(480px, 94vw)", maxHeight: "90vh", overflowY: "auto" }}>
            <h2>{edit.id ? "Modifier la date" : "Nouvelle date institutionnelle"}</h2>
            <label className="field"><span>Nom</span><input value={edit.data.nom} onChange={(e) => setEdit((x) => x && ({ ...x, data: { ...x.data, nom: e.target.value } }))} /></label>
            <label className="field"><span>Description</span><textarea value={edit.data.description ?? ""} onChange={(e) => setEdit((x) => x && ({ ...x, data: { ...x.data, description: e.target.value } }))} /></label>
            <div className="grid-2">
              <label className="field"><span>Type</span>
                <select value={edit.data.type} onChange={(e) => setEdit((x) => x && ({ ...x, data: { ...x.data, type: e.target.value } }))}>
                  <option value="anniversaire">Anniversaire</option>
                  <option value="fete_patron">Fête du saint patron</option>
                  <option value="journee">Journée institutionnelle</option>
                  <option value="commemoration">Commémoration</option>
                </select>
              </label>
              <label className="field"><span>Date fixe (année précise)</span><input type="date" value={edit.data.date_fixe ?? ""} onChange={(e) => setEdit((x) => x && ({ ...x, data: { ...x.data, date_fixe: e.target.value || null } }))} /></label>
              <label className="field"><span>Jour (récurrent)</span><input type="number" min={1} max={31} value={edit.data.jour ?? ""} onChange={(e) => setEdit((x) => x && ({ ...x, data: { ...x.data, jour: e.target.value ? Number(e.target.value) : null } }))} /></label>
              <label className="field"><span>Mois (récurrent)</span>
                <select value={edit.data.mois ?? ""} onChange={(e) => setEdit((x) => x && ({ ...x, data: { ...x.data, mois: e.target.value ? Number(e.target.value) : null } }))}>
                  <option value="">-</option>
                  {MOIS.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </label>
              <label className="field"><span>Rappel (jours avant)</span><input type="number" min={0} max={365} value={edit.data.rappel_jours} onChange={(e) => setEdit((x) => x && ({ ...x, data: { ...x.data, rappel_jours: Number(e.target.value) } }))} /></label>
              <label className="field"><span>Visibilité</span>
                <select value={edit.data.visibilite} onChange={(e) => setEdit((x) => x && ({ ...x, data: { ...x.data, visibilite: e.target.value } }))}>
                  <option value="interne">Interne</option>
                  <option value="membre">Membre</option>
                  <option value="administrateur">Administrateur</option>
                </select>
              </label>
            </div>
            <label className="switch-row"><input type="checkbox" checked={edit.data.actif} onChange={(e) => setEdit((x) => x && ({ ...x, data: { ...x.data, actif: e.target.checked } }))} /><span>Active</span></label>
            <div className="row-actions" style={{ marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Annuler</button>
              <button type="button" className="btn btn-primary" disabled={busy || !edit.data.nom.trim()} onClick={() => void run(async () => {
                if (edit.id) await updateDateInstitutionnelle(token, edit.id, edit.data);
                else await createDateInstitutionnelle(token, edit.data);
                setEdit(null); charger(); setMsg("Date enregistrée.");
              })}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
