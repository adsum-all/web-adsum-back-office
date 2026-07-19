import { useEffect, useState } from "react";

import {
  type DateLiturgique,
  type ReferenceCouleur,
  getCalendrierLiturgique,
  patchCalendrierLiturgique,
} from "../../api.js";
import { RichEditor } from "../RichEditor.js";

/**
 * "Calendrier catholique": the administrable catholic feast catalogue. Fixed feasts
 * carry a month/day; movable feasts are computed each year by the liturgical engine
 * and never re-entered. Each feast can be enabled/disabled, recoloured, described
 * and scoped in visibility. Feasts of the Roman calendar are disabled, not deleted.
 */
const MOIS = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const RANG_LABEL: Record<string, string> = {
  solennite: "Solennité", fete: "Fête", memoire: "Mémoire", dimanche: "Dimanche", triduum: "Triduum", octave: "Octave", jour: "Jour",
};

export function InstitLiturgieTab({
  token,
  canGerer,
  couleurs,
}: Readonly<{ token: string; canGerer: boolean; couleurs: ReferenceCouleur[] }>): JSX.Element {
  const [rows, setRows] = useState<DateLiturgique[]>([]);
  const [edit, setEdit] = useState<DateLiturgique | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const couleursLit = couleurs.filter((c) => c.categorie === "liturgie");

  const charger = (): void => { void getCalendrierLiturgique(token).then(setRows).catch((e) => setErr(String(e?.message ?? e))); };
  useEffect(charger, [token]);

  async function toggle(r: DateLiturgique): Promise<void> {
    setBusy(true); setErr(null);
    try {
      await patchCalendrierLiturgique(token, r.id, { actif: !r.actif });
      setRows((xs) => xs.map((x) => (x.id === r.id ? { ...x, actif: !r.actif } : x)));
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }

  async function sauver(): Promise<void> {
    if (!edit) return;
    setBusy(true); setErr(null);
    try {
      await patchCalendrierLiturgique(token, edit.id, { couleur: edit.couleur, rang: edit.rang, description: edit.description, source: edit.source, visibilite: edit.visibilite });
      setEdit(null); charger();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }

  const hex = (cle: string): string => couleurs.find((c) => c.cle === cle)?.hex ?? "#999";
  const fixes = rows.filter((r) => r.type === "fixe");
  const mobiles = rows.filter((r) => r.type === "mobile");

  const ligne = (r: DateLiturgique): JSX.Element => (
    <tr key={r.id} style={{ opacity: r.actif ? 1 : 0.55 }}>
      <td><span aria-hidden="true" style={{ display: "inline-block", width: 12, height: 12, borderRadius: 3, background: hex(r.couleur), marginRight: 8, verticalAlign: "middle" }} />{r.nom}</td>
      <td>{r.type === "fixe" ? (r.jour && r.mois ? `${r.jour} ${MOIS[r.mois]}` : "-") : "Calculée"}</td>
      <td>{RANG_LABEL[r.rang] ?? r.rang}</td>
      <td>{r.visibilite}</td>
      <td>
        <label className="switch-row" style={{ margin: 0 }}>
          <input type="checkbox" checked={r.actif} disabled={!canGerer || busy} onChange={() => void toggle(r)} />
          <span>{r.actif ? "Affichée" : "Masquée"}</span>
        </label>
      </td>
      {canGerer && <td><button type="button" className="btn btn-ghost btn-inline" onClick={() => setEdit({ ...r })}>Personnaliser</button></td>}
    </tr>
  );

  return (
    <div>
      <p className="muted" style={{ maxWidth: 640 }}>
        Sélectionnez les célébrations à afficher dans le calendrier. Les fêtes mobiles (Pâques, Ascension,
        Pentecôte…) sont calculées automatiquement chaque année à partir de la date de Pâques : aucune ressaisie.
      </p>
      {err && <div className="banner-error" style={{ marginTop: 10 }}>{err}</div>}

      <h3 style={{ marginTop: 18 }}>Dates fixes ({fixes.filter((r) => r.actif).length}/{fixes.length})</h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Célébration</th><th>Date</th><th>Rang</th><th>Visibilité</th><th>Affichage</th>{canGerer && <th></th>}</tr></thead>
          <tbody>{fixes.map(ligne)}</tbody>
        </table>
      </div>

      <h3 style={{ marginTop: 22 }}>Dates mobiles calculées ({mobiles.filter((r) => r.actif).length}/{mobiles.length})</h3>
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Célébration</th><th>Date</th><th>Rang</th><th>Visibilité</th><th>Affichage</th>{canGerer && <th></th>}</tr></thead>
          <tbody>{mobiles.map(ligne)}</tbody>
        </table>
      </div>

      {edit && (
        <div className="drawer-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(15,20,35,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div className="card" style={{ width: "min(560px, 96vw)", maxHeight: "92vh", overflowY: "auto" }}>
            <h2>Personnaliser : {edit.nom}</h2>
            <div className="grid-2">
              <label className="field"><span>Couleur liturgique</span>
                <select value={edit.couleur} onChange={(e) => setEdit((x) => x && ({ ...x, couleur: e.target.value }))}>
                  {couleursLit.map((c) => <option key={c.cle} value={c.cle}>{c.libelle}</option>)}
                </select>
              </label>
              <label className="field"><span>Rang</span>
                <select value={edit.rang} onChange={(e) => setEdit((x) => x && ({ ...x, rang: e.target.value }))}>
                  {Object.entries(RANG_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="field"><span>Visibilité</span>
                <select value={edit.visibilite} onChange={(e) => setEdit((x) => x && ({ ...x, visibilite: e.target.value }))}>
                  <option value="interne">Interne</option>
                  <option value="membre">Membre</option>
                  <option value="administrateur">Administrateur</option>
                </select>
              </label>
              <label className="field"><span>Source</span><input value={edit.source ?? ""} onChange={(e) => setEdit((x) => x && ({ ...x, source: e.target.value || null }))} /></label>
            </div>
            <label className="field" style={{ marginTop: 8 }}><span>Description, prière ou méditation locale</span></label>
            <RichEditor value={edit.description ?? ""} onChange={(html) => setEdit((x) => x && ({ ...x, description: html }))} disabled={!canGerer} />
            <div className="row-actions" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Annuler</button>
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void sauver()}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
