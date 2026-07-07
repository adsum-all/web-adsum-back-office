import { useState } from "react";

import { ApiError, creerCompteMembre } from "../api.js";

/**
 * "Créer un compte membre" tab: create a single member account. The person gets a
 * temporary password by e-mail (and Telegram if linked) and lands at the
 * 'incomplet' stage until they fill and submit their form. onCreated lets the
 * parent refresh the in-progress list so the new account appears immediately.
 */
export function CreerCompteMembre({ token, onCreated }: { token: string; onCreated?: () => void }): JSX.Element {
  const [email, setEmail] = useState("");
  const [prenoms, setPrenoms] = useState("");
  const [nom, setNom] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createAccount(): Promise<void> {
    if (!email.includes("@")) {
      setError("Adresse e-mail invalide.");
      return;
    }
    setBusy(true);
    setMsg(null);
    setError(null);
    try {
      const r = await creerCompteMembre(token, {
        email: email.trim(),
        prenoms: prenoms.trim() || undefined,
        nom: nom.trim() || undefined,
      });
      setMsg(`Compte créé (matricule ${r.matricule}). Le mot de passe temporaire a été envoyé par e-mail.`);
      setEmail("");
      setPrenoms("");
      setNom("");
      onCreated?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Création impossible (e-mail déjà utilisé ?).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2 className="card-title">Créer un compte membre</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Crée le compte et envoie l&apos;accès. Le membre remplit ensuite son formulaire d&apos;inscription : il
        apparaîtra dans l&apos;onglet « Inscriptions en cours », puis « Formulaires reçus » une fois renvoyé.
      </p>
      <div className="toolbar">
        <input className="search" placeholder="Adresse e-mail du membre" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="search" placeholder="Prénoms (optionnel)" value={prenoms} onChange={(e) => setPrenoms(e.target.value)} />
        <input className="search" placeholder="Nom (optionnel)" value={nom} onChange={(e) => setNom(e.target.value)} />
        <button type="button" className="btn btn-primary btn-inline" disabled={busy || !email} onClick={() => void createAccount()}>
          {busy ? "Création..." : "Créer + envoyer l'accès"}
        </button>
      </div>
      {msg && <p className="banner banner-ok">{msg}</p>}
      {error && <p className="banner banner-error">{error}</p>}
    </section>
  );
}
