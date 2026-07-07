import { useState } from "react";

import {
  type CorrectionItem,
  type DossierInscription,
  type InscriptionFiltre,
  type InscriptionItem,
  decisionInscription,
  fetchDocumentContentUrl,
  getCorrections,
  getDossierInscription,
  getInscriptions,
} from "../api.js";
import { useResource } from "../useResource.js";

const DOC_TYPES: Record<string, string> = {
  piece_identite: "Pièce d'identité",
  passeport: "Passeport",
  permis: "Permis de conduire",
  carte_consulaire: "Carte consulaire",
  justificatif_domicile: "Justificatif de domicile",
  photo_identite: "Photo d'identité",
};

function docTypeLabel(type: string): string {
  return DOC_TYPES[type] ?? type;
}

const STATUT_BADGE: Record<string, string> = {
  incomplet: "badge-mut",
  soumis: "badge-warn",
  en_revue: "badge-mut",
  modification_demandee: "badge-warn",
  approuve: "badge-ok",
  refuse: "badge-bad",
};

// A registration is actionable (approve / request changes / refuse) once the
// member has returned the form; the buttons follow the item status, not the tab.
const ACTIONNABLE = new Set(["soumis", "en_revue", "modification_demandee"]);

const CHAMPS_CIBLES: { cle: string; libelle: string }[] = [
  { cle: "prenoms", libelle: "Prénoms" },
  { cle: "nom", libelle: "Nom" },
  { cle: "telephone", libelle: "Téléphone" },
  { cle: "date_naissance", libelle: "Date de naissance" },
  { cle: "genre", libelle: "Genre" },
  { cle: "pays", libelle: "Pays" },
  { cle: "ville", libelle: "Ville" },
  { cle: "region", libelle: "Région" },
  { cle: "adresse", libelle: "Adresse" },
  { cle: "commission_id", libelle: "Commission" },
  { cle: "tribu_id", libelle: "Tribu" },
  { cle: "intendance_id", libelle: "Intendance" },
  { cle: "profession", libelle: "Profession" },
  { cle: "photo", libelle: "Photo" },
  { cle: "piece", libelle: "Pièce d'identité" },
];

const VIDE: Record<string, string> = {
  en_cours: "Aucune inscription en cours (compte créé, formulaire en attente).",
  recus: "Aucun formulaire reçu à examiner.",
  a_valider: "Aucun dossier en attente de validation.",
  validees: "Aucune inscription validée.",
  refusees: "Aucune inscription refusée.",
  toutes: "Aucune inscription.",
};

/**
 * A registration queue for one lifecycle stage. Decision actions (approve / request
 * changes / refuse) appear only on items the member has returned, so read-only
 * stages (in progress, validated) stay clean. Dossier and corrections are viewable
 * on every stage.
 */
export function RevueInscriptions({ token, filtre }: { token: string; filtre: InscriptionFiltre }): JSX.Element {
  const { data, loading, error, reload } = useResource(() => getInscriptions(token, filtre), [token, filtre]);
  const [openMotif, setOpenMotif] = useState<{ id: string; decision: string } | null>(null);
  const [motif, setMotif] = useState("");
  const [champs, setChamps] = useState<string[]>([]);
  const [corrections, setCorrections] = useState<{ id: string; items: CorrectionItem[] } | null>(null);
  const [corrError, setCorrError] = useState<string | null>(null);
  const [dossier, setDossier] = useState<DossierInscription | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);

  const list: InscriptionItem[] = data ?? [];

  async function voirDossier(id: string): Promise<void> {
    setDossierError(null);
    setDossier(null);
    setDossierLoading(true);
    try {
      setDossier(await getDossierInscription(token, id));
    } catch {
      setDossierError("Dossier indisponible.");
    } finally {
      setDossierLoading(false);
    }
  }

  async function openEncryptedDoc(contentPath: string): Promise<void> {
    try {
      const objectUrl = await fetchDocumentContentUrl(token, contentPath);
      window.open(objectUrl, "_blank", "noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
    } catch {
      setDossierError("Document chiffré indisponible.");
    }
  }

  function toggleChamp(cle: string): void {
    setChamps((prev) => (prev.includes(cle) ? prev.filter((c) => c !== cle) : [...prev, cle]));
  }

  async function voirCorrections(id: string): Promise<void> {
    setCorrError(null);
    setCorrections({ id, items: [] });
    try {
      setCorrections({ id, items: await getCorrections(token, id) });
    } catch {
      setCorrError("Corrections indisponibles.");
      setCorrections(null);
    }
  }

  async function decide(id: string, decision: string, withMotif?: string, champsCibles?: string[]): Promise<void> {
    await decisionInscription(token, id, decision, withMotif, champsCibles);
    setOpenMotif(null);
    setMotif("");
    setChamps([]);
    reload();
  }

  return (
    <div>
      {error && <p className="banner banner-error">{error}</p>}
      {loading && <p className="muted">Chargement...</p>}
      {!loading && list.length === 0 && !error && <p className="muted">{VIDE[filtre] ?? "Aucun élément."}</p>}

      {list.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Membre</th>
                <th>Étape</th>
                <th>Pièces</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id}>
                  <td className="mono">{i.matricule}</td>
                  <td>
                    {i.nom || "-"}
                    <br />
                    <span className="muted small">{i.email}</span>
                  </td>
                  <td><span className={`badge ${STATUT_BADGE[i.statut] ?? "badge-mut"}`}>{i.statut_libelle ?? i.statut}</span></td>
                  <td>{i.nb_documents}</td>
                  <td className="small">{i.soumis_le ? new Date(i.soumis_le).toLocaleString("fr-FR") : i.decision_le ? new Date(i.decision_le).toLocaleString("fr-FR") : "-"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" className="btn btn-ghost btn-inline" onClick={() => void voirDossier(i.id)}>Voir le dossier</button>
                      {ACTIONNABLE.has(i.statut) && (
                        <>
                          <button type="button" className="btn btn-primary btn-inline" onClick={() => void decide(i.id, "approuve")}>Approuver</button>
                          <button type="button" className="btn btn-ghost btn-inline" onClick={() => { setChamps([]); setMotif(""); setOpenMotif({ id: i.id, decision: "modification_demandee" }); }}>Modif.</button>
                          <button type="button" className="btn btn-ghost btn-inline" onClick={() => { setChamps([]); setMotif(""); setOpenMotif({ id: i.id, decision: "refuse" }); }}>Refuser</button>
                        </>
                      )}
                      <button type="button" className="btn btn-ghost btn-inline" onClick={() => void voirCorrections(i.id)}>Corrections</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openMotif && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 className="card-title">{openMotif.decision === "refuse" ? "Motif du refus" : "Modification demandée"}</h2>
          {openMotif.decision === "modification_demandee" && (
            <>
              <p className="muted small" style={{ marginTop: 0 }}>Sélectionnez les champs que le membre doit corriger.</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
                {CHAMPS_CIBLES.map((c) => (
                  <label key={c.cle} className="check" style={{ margin: 0 }}>
                    <input type="checkbox" checked={champs.includes(c.cle)} onChange={() => toggleChamp(c.cle)} />
                    {c.libelle}
                  </label>
                ))}
              </div>
            </>
          )}
          <textarea className="textarea" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Expliquez la raison (transmise au membre)..." />
          <div className="form-actions">
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setOpenMotif(null)}>Annuler</button>
            <button
              type="button"
              className="btn btn-primary btn-inline"
              disabled={!motif.trim() || (openMotif.decision === "modification_demandee" && champs.length === 0)}
              onClick={() => void decide(openMotif.id, openMotif.decision, motif.trim(), openMotif.decision === "modification_demandee" ? champs : undefined)}
            >
              Confirmer
            </button>
          </div>
        </div>
      )}

      {dossierError && <p className="banner banner-error">{dossierError}</p>}
      {dossierLoading && <p className="muted">Chargement du dossier...</p>}

      {dossier && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 className="card-title" style={{ margin: 0 }}>
              Dossier de {dossier.membre.prenoms || ""} {dossier.membre.nom || dossier.membre.matricule}
            </h2>
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setDossier(null)}>Fermer</button>
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "0 0 auto" }}>
              <h3 className="card-title" style={{ fontSize: "var(--adsum-text-sm)" }}>Pièce d&apos;identité</h3>
              {dossier.photo_url ? (
                <img src={dossier.photo_url} alt="Pièce d'identité du membre" style={{ width: 220, height: 280, objectFit: "cover", objectPosition: "50% 30%", borderRadius: "var(--adsum-radius-lg)", border: "1px solid var(--adsum-line)", display: "block" }} />
              ) : (
                <div style={{ width: 220, height: 280, borderRadius: "var(--adsum-radius-lg)", border: "1px dashed var(--adsum-line)", display: "grid", placeItems: "center", background: "var(--adsum-board)", color: "var(--adsum-mut)", textAlign: "center", padding: 12 }}>
                  Aucune photo fournie
                </div>
              )}
            </div>
            <div style={{ flex: "1 1 320px", minWidth: 280 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <h3 className="card-title" style={{ fontSize: "var(--adsum-text-sm)", margin: 0 }}>Signature électronique</h3>
                <span className={`badge ${dossier.signature.signe ? "badge-ok" : "badge-bad"}`}>{dossier.signature.signe ? "Signature vérifiée" : "Signature manquante"}</span>
              </div>
              {dossier.signature.engagements.length === 0 ? (
                <p className="muted small">Aucun engagement signé.</p>
              ) : (
                <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
                  {dossier.signature.engagements.map((e, idx) => (
                    <li key={`${e.type}-${e.version}-${idx}`} className="small">
                      <strong>{e.type}</strong> (v{e.version}) {e.signe_le ? `signé le ${new Date(e.signe_le).toLocaleString("fr-FR")}` : "non daté"}{e.canal ? ` par ${e.canal}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <h3 className="card-title" style={{ fontSize: "var(--adsum-text-sm)", marginTop: 20 }}>Documents</h3>
          {dossier.documents.length === 0 ? (
            <p className="muted small">Aucun document transmis.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Type</th><th>Fichier</th><th>Statut</th><th>Reçu le</th><th>Action</th></tr></thead>
                <tbody>
                  {dossier.documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>{docTypeLabel(doc.type)}</td>
                      <td className="muted small">{doc.nom_fichier ?? "-"}</td>
                      <td><span className="badge badge-mut">{doc.statut}</span></td>
                      <td className="small">
                        {doc.recu_le ? new Date(doc.recu_le).toLocaleString("fr-FR") : "-"}
                        {doc.chiffre ? <span className="badge badge-mut" style={{ marginLeft: 6 }}>chiffré</span> : null}
                      </td>
                      <td>
                        {doc.url ? (
                          <a className="btn btn-ghost btn-inline" href={doc.url} target="_blank" rel="noreferrer">Ouvrir</a>
                        ) : doc.content_path ? (
                          <button type="button" className="btn btn-ghost btn-inline" onClick={() => void openEncryptedDoc(doc.content_path as string)}>Ouvrir</button>
                        ) : (
                          <button type="button" className="btn btn-ghost btn-inline" disabled>Ouvrir</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {corrError && <p className="banner banner-error">{corrError}</p>}
      {corrections && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="card-title" style={{ margin: 0 }}>Corrections du dossier</h2>
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setCorrections(null)}>Fermer</button>
          </div>
          {corrections.items.length === 0 ? (
            <p className="muted">Aucune correction enregistrée pour ce dossier.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Champ</th><th>Ancienne valeur</th><th>Nouvelle valeur</th><th>Modifié le</th></tr></thead>
                <tbody>
                  {corrections.items.map((c, idx) => (
                    <tr key={`${c.champ}-${idx}`}>
                      <td className="mono">{c.champ}</td>
                      <td className="muted">{c.ancienne_valeur ?? "-"}</td>
                      <td><strong>{c.nouvelle_valeur ?? "-"}</strong></td>
                      <td className="small">{c.modifie_le ? new Date(c.modifie_le).toLocaleString("fr-FR") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
