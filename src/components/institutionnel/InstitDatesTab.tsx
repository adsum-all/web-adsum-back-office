import { useEffect, useState } from "react";

import {
  type DateInstitInput,
  type DateInstitutionnelle,
  type ReferenceCouleur,
  createDateInstitutionnelle,
  deleteDateInstitutionnelle,
  getDatesInstitutionnelles,
  updateDateInstitutionnelle,
} from "../../api.js";
import { RichEditor } from "../RichEditor.js";

/**
 * "Dates de l'organisation": commemorative/institutional reference dates. These are
 * NOT activities (no attendance, survey or QR). A yearly date is declared once and
 * recurs automatically; the anniversary count is derived from the year of origin.
 */
const TYPES: { value: string; label: string }[] = [
  { value: "anniversaire_fondation", label: "Anniversaire de fondation" },
  { value: "commemoration", label: "Commémoration institutionnelle" },
  { value: "reconnaissance", label: "Journée de reconnaissance" },
  { value: "priere", label: "Journée de prière institutionnelle" },
  { value: "fete_saint_patron", label: "Fête du saint patron" },
  { value: "anniversaire_branche", label: "Anniversaire d'une branche ou mission" },
  { value: "date_historique", label: "Date historique" },
  { value: "journee_internationale", label: "Journée internationale observée" },
  { value: "autre", label: "Autre date institutionnelle" },
];
const MOIS = ["", "janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

function nouvelle(): DateInstitInput {
  return {
    nom: "", description: null, type: "anniversaire_fondation", date_fixe: null, mois: null, jour: null,
    annee_origine: null, repetition_annuelle: true, afficher_calendrier: true, couleur: "inst_anniversaire",
    priorite: "normale", statut: "brouillon", categorie: "institution", toute_journee: true, heure_debut: null,
    heure_fin: null, lieu: null, lien: null, image_url: null, message_membre: null, source: null, note_admin: null,
    rappel_jours: 0, visibilite: "membre", actif: true,
  };
}

const STATUT_LABEL: Record<string, string> = { brouillon: "Brouillon", publie: "Publié", archive: "Archivé" };

export function InstitDatesTab({
  token,
  canGerer,
  couleurs,
}: Readonly<{ token: string; canGerer: boolean; couleurs: ReferenceCouleur[] }>): JSX.Element {
  const [dates, setDates] = useState<DateInstitutionnelle[]>([]);
  const [edit, setEdit] = useState<{ id: string | null; data: DateInstitInput } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const couleursInst = couleurs.filter((c) => c.categorie === "institution");

  const charger = (): void => { void getDatesInstitutionnelles(token).then(setDates).catch((e) => setErr(String(e?.message ?? e))); };
  useEffect(charger, [token]);

  async function run(fn: () => Promise<void>): Promise<void> {
    setBusy(true); setErr(null);
    try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); } finally { setBusy(false); }
  }

  const setData = (patch: Partial<DateInstitInput>): void => setEdit((x) => (x ? { ...x, data: { ...x.data, ...patch } } : x));
  const hex = (cle: string): string => couleurs.find((c) => c.cle === cle)?.hex ?? "#999";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <p className="muted" style={{ maxWidth: 560 }}>
          Ajoutez les dates fondatrices, anniversaires et commémorations de l'organisation. Elles apparaissent
          automatiquement dans le calendrier des membres chaque année et n'ouvrent ni pointage, ni sondage.
        </p>
        {canGerer && <button type="button" className="btn btn-primary btn-inline" onClick={() => setEdit({ id: null, data: nouvelle() })}>+ Ajouter une date institutionnelle</button>}
      </div>
      {err && <div className="banner-error" style={{ marginTop: 10 }}>{err}</div>}

      {dates.length === 0 ? (
        <p className="muted" style={{ marginTop: 14 }}>Aucune date institutionnelle pour le moment.</p>
      ) : (
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="table">
            <thead><tr><th>Titre</th><th>Type</th><th>Quand</th><th>Origine</th><th>Statut</th><th>Couleur</th>{canGerer && <th></th>}</tr></thead>
            <tbody>
              {dates.map((d) => (
                <tr key={d.id}>
                  <td>{d.nom}</td>
                  <td>{TYPES.find((t) => t.value === d.type)?.label ?? d.type}</td>
                  <td>{d.date_fixe && !d.repetition_annuelle ? new Date(d.date_fixe).toLocaleDateString("fr-FR") : d.jour && d.mois ? `${d.jour} ${MOIS[d.mois]}` : "-"}</td>
                  <td>{d.annee_origine ?? "-"}</td>
                  <td><span className={`inst-pill inst-pill-${d.statut}`}>{STATUT_LABEL[d.statut] ?? d.statut}</span></td>
                  <td><span aria-hidden="true" style={{ display: "inline-block", width: 14, height: 14, borderRadius: 4, background: hex(d.couleur), verticalAlign: "middle" }} /></td>
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

      {edit && (
        <div className="drawer-backdrop" style={{ position: "fixed", inset: 0, background: "rgba(15,20,35,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
          <div className="card" style={{ width: "min(620px, 96vw)", maxHeight: "92vh", overflowY: "auto" }}>
            <h2>{edit.id ? "Modifier la date" : "Nouvelle date institutionnelle"}</h2>
            <div className="grid-2">
              <label className="field"><span>Type *</span>
                <select value={edit.data.type} onChange={(e) => setData({ type: e.target.value })}>
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </label>
              <label className="field"><span>Titre *</span><input value={edit.data.nom} onChange={(e) => setData({ nom: e.target.value })} /></label>
              <label className="field"><span>Jour *</span><input type="number" min={1} max={31} value={edit.data.jour ?? ""} onChange={(e) => setData({ jour: e.target.value ? Number(e.target.value) : null })} /></label>
              <label className="field"><span>Mois *</span>
                <select value={edit.data.mois ?? ""} onChange={(e) => setData({ mois: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">-</option>
                  {MOIS.slice(1).map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
              </label>
              <label className="field"><span>Année d'origine (fondation)</span><input type="number" min={1} max={3000} value={edit.data.annee_origine ?? ""} onChange={(e) => setData({ annee_origine: e.target.value ? Number(e.target.value) : null })} placeholder="Ex : 2010" /></label>
              <label className="field"><span>Priorité</span>
                <select value={edit.data.priorite} onChange={(e) => setData({ priorite: e.target.value })}>
                  <option value="normale">Normale</option>
                  <option value="importante">Importante</option>
                  <option value="solennelle">Solennelle</option>
                </select>
              </label>
              <label className="field"><span>Couleur de catégorie</span>
                <select value={edit.data.couleur} onChange={(e) => setData({ couleur: e.target.value })}>
                  {couleursInst.map((c) => <option key={c.cle} value={c.cle}>{c.libelle}</option>)}
                </select>
              </label>
              <label className="field"><span>Statut</span>
                <select value={edit.data.statut} onChange={(e) => setData({ statut: e.target.value })}>
                  <option value="brouillon">Brouillon</option>
                  <option value="publie">Publié</option>
                  <option value="archive">Archivé</option>
                </select>
              </label>
              <label className="field"><span>Visibilité</span>
                <select value={edit.data.visibilite} onChange={(e) => setData({ visibilite: e.target.value })}>
                  <option value="interne">Interne</option>
                  <option value="membre">Membre</option>
                  <option value="administrateur">Administrateur</option>
                </select>
              </label>
              <label className="field"><span>Rappel (jours avant, 0 = aucun)</span><input type="number" min={0} max={365} value={edit.data.rappel_jours} onChange={(e) => setData({ rappel_jours: Number(e.target.value) })} /></label>
            </div>

            <label className="field" style={{ marginTop: 8 }}><span>Description riche</span></label>
            <RichEditor value={edit.data.description ?? ""} onChange={(html) => setData({ description: html })} disabled={!canGerer} />

            <div className="grid-2" style={{ marginTop: 10 }}>
              <label className="field"><span>Image ou bannière (URL)</span><input value={edit.data.image_url ?? ""} onChange={(e) => setData({ image_url: e.target.value || null })} placeholder="https://..." /></label>
              <label className="field"><span>Lien officiel</span><input value={edit.data.lien ?? ""} onChange={(e) => setData({ lien: e.target.value || null })} placeholder="https://..." /></label>
              <label className="field"><span>Lieu</span><input value={edit.data.lieu ?? ""} onChange={(e) => setData({ lieu: e.target.value || null })} /></label>
              <label className="field"><span>Source institutionnelle validée</span><input value={edit.data.source ?? ""} onChange={(e) => setData({ source: e.target.value || null })} /></label>
            </div>
            <label className="field" style={{ marginTop: 8 }}><span>Note administrative (non visible des membres)</span><textarea value={edit.data.note_admin ?? ""} onChange={(e) => setData({ note_admin: e.target.value || null })} /></label>

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
              <label className="switch-row"><input type="checkbox" checked={edit.data.repetition_annuelle} onChange={(e) => setData({ repetition_annuelle: e.target.checked })} /><span>Répétition annuelle automatique</span></label>
              <label className="switch-row"><input type="checkbox" checked={edit.data.afficher_calendrier} onChange={(e) => setData({ afficher_calendrier: e.target.checked })} /><span>Afficher dans le calendrier</span></label>
              <label className="switch-row"><input type="checkbox" checked={edit.data.toute_journee} onChange={(e) => setData({ toute_journee: e.target.checked })} /><span>Toute la journée</span></label>
              <label className="switch-row"><input type="checkbox" checked={edit.data.actif} onChange={(e) => setData({ actif: e.target.checked })} /><span>Active</span></label>
            </div>

            <div className="row-actions" style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setEdit(null)}>Annuler</button>
              <button type="button" className="btn btn-primary" disabled={busy || !edit.data.nom.trim() || !edit.data.mois || !edit.data.jour} onClick={() => void run(async () => {
                if (edit.id) await updateDateInstitutionnelle(token, edit.id, edit.data);
                else await createDateInstitutionnelle(token, edit.data);
                setEdit(null); charger();
              })}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
