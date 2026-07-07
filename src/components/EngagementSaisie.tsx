import { useState } from "react";

import { ApiError, createEngagementManuel } from "../api.js";

/**
 * Manual quick-entry for the welcome/event team: capture engagement leads one after
 * another during a live event, with no friction. Same rules as the public form
 * (e-mail required and unique, family name uppercased server side).
 */
export function EngagementSaisie({ token, onAdded }: { token: string; onAdded?: () => void }): JSX.Element {
  const [email, setEmail] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [nom, setNom] = useState("");
  const [indicatif, setIndicatif] = useState("");
  const [telephone, setTelephone] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!email.includes("@")) {
      setError("Adresse e-mail invalide.");
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      await createEngagementManuel(token, {
        email: email.trim(),
        prenoms: prenoms.trim() || null,
        nom: nom.trim() || null,
        telephone: telephone.trim() ? `${indicatif.trim()} ${telephone.trim()}` : null,
        pays_indicatif: indicatif.trim() || null,
      });
      setMsg(`« ${email.trim()} » enregistré.`);
      setEmail("");
      setPrenoms("");
      setNom("");
      setTelephone("");
      onAdded?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <h2 className="section-title">Saisie manuelle</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Pour l&apos;équipe d&apos;accueil : saisissez une personne, validez, recommencez. Une même adresse e-mail
        n&apos;est jamais enregistrée deux fois.
      </p>
      <div className="form-grid">
        <label>
          <span>Adresse e-mail *</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="personne@exemple.com" required />
        </label>
        <label>
          <span>Prénom(s)</span>
          <input value={prenoms} onChange={(e) => setPrenoms(e.target.value)} />
        </label>
        <label>
          <span>Nom de famille</span>
          <input value={nom} onChange={(e) => setNom(e.target.value)} style={{ textTransform: "uppercase" }} />
        </label>
        <label>
          <span>Indicatif</span>
          <input value={indicatif} onChange={(e) => setIndicatif(e.target.value)} placeholder="+225" style={{ maxWidth: 110 }} />
        </label>
        <label>
          <span>Téléphone</span>
          <input type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="Numéro" />
        </label>
      </div>
      {msg && <p className="banner banner-ok">{msg}</p>}
      {error && <p className="banner banner-error">{error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-inline" disabled={busy || !email}>
          {busy ? "Enregistrement..." : "+ Enregistrer et continuer"}
        </button>
      </div>
    </form>
  );
}
