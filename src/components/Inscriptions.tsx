import { useState } from "react";

import { type InscriptionItem, creerCompteMembre, decisionInscription, getInscriptions } from "../api.js";
import { useResource } from "../useResource.js";

const STATUT: Record<string, string> = {
  soumis: "badge-warn",
  en_revue: "badge-mut",
  modification_demandee: "badge-warn",
};

export function Inscriptions({ token }: { token: string }): JSX.Element {
  const { data, loading, error, reload } = useResource(() => getInscriptions(token), [token]);
  const [email, setEmail] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [nom, setNom] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [openMotif, setOpenMotif] = useState<{ id: string; decision: string } | null>(null);
  const [motif, setMotif] = useState("");

  const list: InscriptionItem[] = data ?? [];

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

  async function decide(id: string, decision: string, withMotif?: string): Promise<void> {
    await decisionInscription(token, id, decision, withMotif);
    setOpenMotif(null);
    setMotif("");
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
                      <button type="button" className="btn btn-primary btn-inline" onClick={() => void decide(i.id, "approuve")}>
                        Approuver
                      </button>
                      <button type="button" className="btn btn-ghost btn-inline" onClick={() => setOpenMotif({ id: i.id, decision: "modification_demandee" })}>
                        Modif.
                      </button>
                      <button type="button" className="btn btn-ghost btn-inline" onClick={() => setOpenMotif({ id: i.id, decision: "refuse" })}>
                        Refuser
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
          <textarea className="textarea" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Expliquez la raison (transmise au membre)..." />
          <div className="form-actions">
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setOpenMotif(null)}>
              Annuler
            </button>
            <button type="button" className="btn btn-primary btn-inline" disabled={!motif.trim()} onClick={() => void decide(openMotif.id, openMotif.decision, motif.trim())}>
              Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
