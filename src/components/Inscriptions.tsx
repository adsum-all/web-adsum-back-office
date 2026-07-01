import { useState } from "react";

import {
  type CorrectionItem,
  type DossierInscription,
  type InscriptionItem,
  creerCompteMembre,
  decisionInscription,
  getCorrections,
  getDossierInscription,
  getInscriptions,
} from "../api.js";
import { useResource } from "../useResource.js";

// Human labels for the document types returned by the dossier endpoint.
const DOC_TYPES: Record<string, string> = {
  piece_identite: "Piece d'identite",
  passeport: "Passeport",
  permis: "Permis de conduire",
  carte_consulaire: "Carte consulaire",
  justificatif_domicile: "Justificatif de domicile",
  photo_identite: "Photo d'identite",
};

function docTypeLabel(type: string): string {
  return DOC_TYPES[type] ?? type;
}

const STATUT: Record<string, string> = {
  soumis: "badge-warn",
  en_revue: "badge-mut",
  modification_demandee: "badge-warn",
};

// Champs que le membre peut etre invite a corriger (decision modification_demandee).
const CHAMPS_CIBLES: { cle: string; libelle: string }[] = [
  { cle: "prenoms", libelle: "Prenoms" },
  { cle: "nom", libelle: "Nom" },
  { cle: "telephone", libelle: "Telephone" },
  { cle: "date_naissance", libelle: "Date de naissance" },
  { cle: "genre", libelle: "Genre" },
  { cle: "pays", libelle: "Pays" },
  { cle: "ville", libelle: "Ville" },
  { cle: "region", libelle: "Region" },
  { cle: "adresse", libelle: "Adresse" },
  { cle: "commission_id", libelle: "Commission" },
  { cle: "tribu_id", libelle: "Tribu" },
  { cle: "intendance_id", libelle: "Intendance" },
  { cle: "profession", libelle: "Profession" },
  { cle: "photo", libelle: "Photo" },
  { cle: "piece", libelle: "Piece d'identite" },
];

export function Inscriptions({ token }: { token: string }): JSX.Element {
  const { data, loading, error, reload } = useResource(() => getInscriptions(token), [token]);
  const [email, setEmail] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [nom, setNom] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
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
      const d = await getDossierInscription(token, id);
      setDossier(d);
    } catch {
      setDossierError("Dossier indisponible.");
    } finally {
      setDossierLoading(false);
    }
  }

  function toggleChamp(cle: string): void {
    setChamps((prev) => (prev.includes(cle) ? prev.filter((c) => c !== cle) : [...prev, cle]));
  }

  async function voirCorrections(id: string): Promise<void> {
    setCorrError(null);
    setCorrections({ id, items: [] });
    try {
      const items = await getCorrections(token, id);
      setCorrections({ id, items });
    } catch {
      setCorrError("Corrections indisponibles.");
      setCorrections(null);
    }
  }

  async function createAccount(): Promise<void> {
    if (!email.includes("@")) {
      setMsg("Adresse e-mail invalide.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await creerCompteMembre(token, { email: email.trim(), prenoms: prenoms.trim() || undefined, nom: nom.trim() || undefined });
      setMsg(`Compte créé (matricule ${r.matricule}). Le mot de passe temporaire a été envoyé par e-mail.`);
      setEmail("");
      setPrenoms("");
      setNom("");
      reload();
    } catch {
      setMsg("Création impossible (e-mail déjà utilisé ?).");
    } finally {
      setBusy(false);
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
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Inscriptions à valider</h1>
          <p className="muted">Création de compte, examen des dossiers et décision finale.</p>
        </div>
      </header>

      <section className="card">
        <h2 className="card-title">Créer un compte membre</h2>
        <div className="toolbar">
          <input className="search" placeholder="Adresse e-mail du membre" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="search" placeholder="Prénoms (optionnel)" value={prenoms} onChange={(e) => setPrenoms(e.target.value)} />
          <input className="search" placeholder="Nom (optionnel)" value={nom} onChange={(e) => setNom(e.target.value)} />
          <button type="button" className="btn btn-primary btn-inline" disabled={busy || !email} onClick={() => void createAccount()}>
            {busy ? "Création..." : "Créer + envoyer l'accès"}
          </button>
        </div>
        {msg && <p className="banner banner-ok">{msg}</p>}
      </section>

      {error && <p className="banner banner-error">{error}</p>}
      {loading && <p className="muted">Chargement...</p>}

      {!loading && list.length === 0 && !error && <p className="muted">Aucun dossier en attente de validation.</p>}

      {list.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Matricule</th>
                <th>Membre</th>
                <th>Statut</th>
                <th>Pièces</th>
                <th>Soumis le</th>
                <th>Décision</th>
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
                  <td>
                    <span className={`badge ${STATUT[i.statut] ?? "badge-mut"}`}>{i.statut}</span>
                  </td>
                  <td>{i.nb_documents}</td>
                  <td className="small">{i.soumis_le ? new Date(i.soumis_le).toLocaleString("fr-FR") : "-"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" className="btn btn-ghost btn-inline" onClick={() => void voirDossier(i.id)}>
                        Voir le dossier
                      </button>
                      <button type="button" className="btn btn-primary btn-inline" onClick={() => void decide(i.id, "approuve")}>
                        Approuver
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-inline"
                        onClick={() => {
                          setChamps([]);
                          setMotif("");
                          setOpenMotif({ id: i.id, decision: "modification_demandee" });
                        }}
                      >
                        Modif.
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-inline"
                        onClick={() => {
                          setChamps([]);
                          setMotif("");
                          setOpenMotif({ id: i.id, decision: "refuse" });
                        }}
                      >
                        Refuser
                      </button>
                      <button type="button" className="btn btn-ghost btn-inline" onClick={() => void voirCorrections(i.id)}>
                        Voir les corrections
                      </button>
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
              <p className="muted small" style={{ marginTop: 0 }}>
                Selectionnez les champs que le membre doit corriger.
              </p>
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
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setOpenMotif(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="btn btn-primary btn-inline"
              disabled={!motif.trim() || (openMotif.decision === "modification_demandee" && champs.length === 0)}
              onClick={() =>
                void decide(
                  openMotif.id,
                  openMotif.decision,
                  motif.trim(),
                  openMotif.decision === "modification_demandee" ? champs : undefined,
                )
              }
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
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setDossier(null)}>
              Fermer
            </button>
          </div>

          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: "0 0 auto" }}>
              <h3 className="card-title" style={{ fontSize: "var(--adsum-text-sm)" }}>
                Piece d'identite
              </h3>
              {dossier.photo_url ? (
                <img
                  src={dossier.photo_url}
                  alt="Piece d'identite du membre"
                  style={{
                    width: 220,
                    height: 280,
                    objectFit: "cover",
                    borderRadius: "var(--adsum-radius-lg)",
                    border: "1px solid var(--adsum-line)",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 220,
                    height: 280,
                    borderRadius: "var(--adsum-radius-lg)",
                    border: "1px dashed var(--adsum-line)",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--adsum-board)",
                    color: "var(--adsum-mut)",
                    textAlign: "center",
                    padding: 12,
                  }}
                >
                  Aucune photo fournie
                </div>
              )}
            </div>

            <div style={{ flex: "1 1 320px", minWidth: 280 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <h3 className="card-title" style={{ fontSize: "var(--adsum-text-sm)", margin: 0 }}>
                  Signature electronique
                </h3>
                <span className={`badge ${dossier.signature.signe ? "badge-ok" : "badge-bad"}`}>
                  {dossier.signature.signe ? "Signature verifiee" : "Signature manquante"}
                </span>
              </div>

              {dossier.signature.engagements.length === 0 ? (
                <p className="muted small">Aucun engagement signe.</p>
              ) : (
                <ul style={{ margin: "0 0 12px", paddingLeft: 18 }}>
                  {dossier.signature.engagements.map((e, idx) => (
                    <li key={`${e.type}-${e.version}-${idx}`} className="small">
                      <strong>{e.type}</strong> (v{e.version}){" "}
                      {e.signe_le ? `signe le ${new Date(e.signe_le).toLocaleString("fr-FR")}` : "non date"}
                      {e.canal ? ` par ${e.canal}` : ""}
                    </li>
                  ))}
                </ul>
              )}

              {dossier.signature.preuves.length > 0 && (
                <>
                  <h3 className="card-title" style={{ fontSize: "var(--adsum-text-sm)" }}>
                    Preuves
                  </h3>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {dossier.signature.preuves.map((p) => (
                      <li key={p.id} className="small">
                        <span className="mono">{p.hash_preuve ? `${p.hash_preuve.slice(0, 12)}...` : "-"}</span>{" "}
                        {p.signe_le ? new Date(p.signe_le).toLocaleString("fr-FR") : "-"}
                        {p.canal ? ` (${p.canal})` : ""}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>

          <h3 className="card-title" style={{ fontSize: "var(--adsum-text-sm)", marginTop: 20 }}>
            Documents
          </h3>
          {dossier.documents.length === 0 ? (
            <p className="muted small">Aucun document transmis.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Fichier</th>
                    <th>Statut</th>
                    <th>Recu le</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dossier.documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>{docTypeLabel(doc.type)}</td>
                      <td className="muted small">{doc.nom_fichier ?? "-"}</td>
                      <td>
                        <span className="badge badge-mut">{doc.statut}</span>
                      </td>
                      <td className="small">{doc.recu_le ? new Date(doc.recu_le).toLocaleString("fr-FR") : "-"}</td>
                      <td>
                        {doc.url ? (
                          <a className="btn btn-ghost btn-inline" href={doc.url} target="_blank" rel="noreferrer">
                            Ouvrir
                          </a>
                        ) : (
                          <button type="button" className="btn btn-ghost btn-inline" disabled>
                            Ouvrir
                          </button>
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
            <h2 className="card-title" style={{ margin: 0 }}>
              Corrections du dossier
            </h2>
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setCorrections(null)}>
              Fermer
            </button>
          </div>
          {corrections.items.length === 0 ? (
            <p className="muted">Aucune correction enregistree pour ce dossier.</p>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Champ</th>
                    <th>Ancienne valeur</th>
                    <th>Nouvelle valeur</th>
                    <th>Modifié le</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.items.map((c, idx) => (
                    <tr key={`${c.champ}-${idx}`}>
                      <td className="mono">{c.champ}</td>
                      <td className="muted">{c.ancienne_valeur ?? "-"}</td>
                      <td>
                        <strong>{c.nouvelle_valeur ?? "-"}</strong>
                      </td>
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
