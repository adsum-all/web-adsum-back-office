import { useEffect, useState } from "react";

import {
  type ModeleAnniversaire,
  declencherAnniversaires,
  getModeleAnniversaire,
  setModeleAnniversaire,
} from "../api.js";
import { Switch } from "./Switch.js";

/** Admin editor for the automatic birthday message, plus a manual trigger. */
export function Anniversaires({ token }: { token: string }): JSX.Element {
  const [modele, setModele] = useState<ModeleAnniversaire | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getModeleAnniversaire(token).then(setModele).catch(() => setError("Chargement impossible."));
  }, [token]);

  function set<K extends keyof ModeleAnniversaire>(key: K, value: ModeleAnniversaire[K]): void {
    setModele((m) => (m ? { ...m, [key]: value } : m));
  }

  async function save(): Promise<void> {
    if (!modele) return;
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      await setModeleAnniversaire(token, modele);
      setNote("Message enregistre.");
    } catch {
      setError("Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function trigger(): Promise<void> {
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const r = await declencherAnniversaires(token);
      setNote(`Envoi declenche : ${r.envoyes} membre(s) fete(s) aujourd'hui.`);
    } catch {
      setError("Declenchement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Souhaits d'anniversaire</h1>
          <p className="muted">
            Message envoye automatiquement chaque jour aux membres dont c'est l'anniversaire (in-app, e-mail, et Telegram
            ou WhatsApp si le membre a lie son canal). Utilisez <span className="mono">{"{prenom}"}</span> pour inserer le prenom.
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void trigger()}>
          Declencher maintenant
        </button>
      </header>

      {note && <p className="banner banner-ok">{note}</p>}
      {error && <p className="banner banner-error">{error}</p>}

      {modele && (
        <section className="card">
          <h2 className="card-title">Message</h2>
          <label className="full">
            <span>Titre</span>
            <input value={modele.titre} onChange={(e) => set("titre", e.target.value)} placeholder="Joyeux anniversaire {prenom} !" />
          </label>
          <label className="full">
            <span>Corps du message</span>
            <textarea
              rows={5}
              value={modele.corps}
              onChange={(e) => set("corps", e.target.value)}
              style={{ width: "100%", resize: "vertical", padding: "10px 12px", borderRadius: "var(--adsum-radius-md)", border: "1px solid var(--adsum-line)", fontFamily: "inherit", fontSize: "var(--adsum-text-sm)" }}
            />
          </label>
          <label className="full">
            <span>Image (URL, facultatif)</span>
            <input value={modele.image_url ?? ""} onChange={(e) => set("image_url", e.target.value || null)} placeholder="https://..." />
          </label>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <Switch checked={modele.actif} onChange={() => set("actif", !modele.actif)} label="Envoi automatique des messages d'anniversaire" />
            <span>Envoi automatique {modele.actif ? "activé" : "désactivé"}</span>
          </div>

          {modele.image_url && (
            <div style={{ marginTop: 12 }}>
              <img src={modele.image_url} alt="" style={{ maxWidth: 320, maxHeight: 180, objectFit: "cover", borderRadius: 12, border: "1px solid var(--adsum-line)" }} />
            </div>
          )}

          <div className="form-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void save()}>
              {busy ? "Enregistrement..." : "Enregistrer le message"}
            </button>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="card-title">Apercu du rendu</h2>
        <div style={{ textAlign: "center", padding: "22px 16px", background: "#f4f6fb", borderRadius: 14 }}>
          <div style={{ fontSize: 40 }}>🎉🎂</div>
          <div style={{ fontFamily: "var(--adsum-font-display, inherit)", fontWeight: 700, fontSize: 20, margin: "8px 0", color: "var(--adsum-ink)" }}>
            {(modele?.titre ?? "").replace("{prenom}", "Emmanuel")}
          </div>
          <p className="muted" style={{ maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
            {(modele?.corps ?? "").replace("{prenom}", "Emmanuel")}
          </p>
          <p style={{ marginTop: 14, fontWeight: 600, color: "var(--adsum-accent, #2a4fad)" }}>La fraternité du Sacerdoce Royal 🙏</p>
        </div>
      </section>
    </div>
  );
}
