import { useMemo, useState } from "react";

import { ApiError, type MembresLotResult, creerMembresLot } from "../api.js";

interface Ligne {
  email: string;
  prenoms?: string;
  nom?: string;
}

// One member per line: "email", or "email; prénoms; nom" (';' or ',' or tab).
function parseLignes(texte: string): Ligne[] {
  const out: Ligne[] = [];
  for (const brut of texte.split(/\r?\n/)) {
    const ligne = brut.trim();
    if (!ligne) continue;
    const parts = ligne.split(/[;,\t]/).map((p) => p.trim());
    const email = parts[0]?.toLowerCase();
    if (email) out.push({ email, prenoms: parts[1] || undefined, nom: parts[2] || undefined });
  }
  return out;
}

/**
 * "Créer des comptes en masse" tab: register several members at once. Each valid
 * line becomes a member registration (temp password sent). Duplicate e-mails are
 * skipped and reported, never a hard failure, so one bad row never aborts the batch.
 */
export function CreerComptesMasse({ token, onCreated }: { token: string; onCreated?: () => void }): JSX.Element {
  const [texte, setTexte] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<MembresLotResult | null>(null);

  const lignes = useMemo(() => parseLignes(texte), [texte]);

  async function submit(): Promise<void> {
    if (lignes.length === 0) {
      setError("Saisissez au moins une adresse e-mail (une par ligne).");
      return;
    }
    setBusy(true);
    setError(null);
    setRes(null);
    try {
      const r = await creerMembresLot(token, lignes);
      setRes(r);
      if (r.crees > 0) {
        setTexte("");
        onCreated?.();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="card-title">Créer des comptes en masse</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Une personne par ligne. Formats acceptés : <span className="mono">email</span> ou{" "}
        <span className="mono">email; prénoms; nom</span>. Chaque personne reçoit un accès temporaire et apparaît
        dans « Inscriptions en cours ». Une même adresse e-mail n&apos;est jamais créée deux fois.
      </p>
      <textarea
        className="textarea"
        rows={8}
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        placeholder={"jean.dupont@example.com\nmarie.koffi@example.com; Marie; KOFFI"}
      />
      <p className="muted small">{lignes.length} ligne{lignes.length > 1 ? "s" : ""} détectée{lignes.length > 1 ? "s" : ""}.</p>
      {error && <p className="banner banner-error">{error}</p>}
      <div className="form-actions">
        <button type="button" className="btn btn-primary btn-inline" disabled={busy || lignes.length === 0} onClick={() => void submit()}>
          {busy ? "Création..." : `Créer ${lignes.length || ""} compte${lignes.length > 1 ? "s" : ""}`}
        </button>
      </div>

      {res && (
        <div style={{ marginTop: 12 }}>
          <p className="banner banner-ok">{res.crees} compte{res.crees > 1 ? "s" : ""} créé{res.crees > 1 ? "s" : ""} et accès envoyé.</p>
          {res.doublons.length > 0 && (
            <p className="banner banner-warn">
              {res.doublons.length} doublon{res.doublons.length > 1 ? "s" : ""} ignoré{res.doublons.length > 1 ? "s" : ""} : {res.doublons.join(", ")}
            </p>
          )}
          {res.erreurs.length > 0 && (
            <div className="banner banner-error">
              {res.erreurs.length} erreur{res.erreurs.length > 1 ? "s" : ""} :
              <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                {res.erreurs.map((e) => (
                  <li key={e.email} className="small">{e.email} : {e.raison}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
