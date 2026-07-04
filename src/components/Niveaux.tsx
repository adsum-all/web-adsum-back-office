import { useState } from "react";

import {
  ApiError,
  type NiveauEngagement,
  createNiveau,
  deleteNiveau,
  getNiveaux,
  updateNiveau,
} from "../api.js";
import { useResource } from "../useResource.js";
import { InfoTip } from "./InfoTip.js";

function slugCle(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

/**
 * Admin catalogue of engagement levels (membre.type_membre). The administration
 * creates, renames, reorders and deactivates levels without any code change; the
 * hierarchical order is the "ordre" column (lower first).
 */
export function Niveaux({ token }: { token: string }): JSX.Element {
  const niveaux = useResource(() => getNiveaux(token), [token]);
  const [libelle, setLibelle] = useState("");
  const [ordre, setOrdre] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const cle = slugCle(libelle);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!libelle.trim() || cle.length < 2) {
      setError("Le libellé doit donner une clé d'au moins deux lettres.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createNiveau(token, { cle, libelle: libelle.trim(), ordre });
      setLibelle("");
      setOrdre((o) => o + 10);
      niveaux.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  const items = niveaux.data ?? [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Niveaux d'engagement</h1>
          <p className="muted">
            Catalogue hiérarchique des niveaux d'engagement des membres. Créez, renommez, réordonnez ou désactivez un
            niveau sans intervention technique.
          </p>
        </div>
      </header>

      <form className="form-card" onSubmit={submit}>
        <div className="form-grid">
          <label>
            <span>Libellé *</span>
            <input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Ex : Membre actif" required />
          </label>
          <label>
            <span>
              Ordre hiérarchique
              <InfoTip text="Les niveaux sont affichés du plus petit ordre au plus grand." />
            </span>
            <input type="number" value={ordre} onChange={(e) => setOrdre(Number(e.target.value))} />
          </label>
        </div>
        {libelle.trim() && <p className="muted small">Clé technique : <span className="mono">{cle || "(invalide)"}</span></p>}
        {error && <p className="banner banner-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
            {busy ? "Création..." : "+ Nouveau niveau"}
          </button>
        </div>
      </form>

      {niveaux.error && <p className="banner banner-error">{niveaux.error}</p>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Ordre</th>
              <th>Libellé</th>
              <th>Clé</th>
              <th>État</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!niveaux.loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">Aucun niveau.</td>
              </tr>
            )}
            {items.map((n) => (
              <NiveauRow key={n.cle} token={token} niveau={n} onChanged={niveaux.reload} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NiveauRow({
  token,
  niveau,
  onChanged,
}: {
  token: string;
  niveau: NiveauEngagement;
  onChanged: () => void;
}): JSX.Element {
  const [libelle, setLibelle] = useState(niveau.libelle);
  const [ordre, setOrdre] = useState(niveau.ordre);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    try {
      await action();
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const dirty = libelle !== niveau.libelle || ordre !== niveau.ordre;

  return (
    <tr>
      <td style={{ width: 90 }}>
        <input type="number" value={ordre} disabled={busy} onChange={(e) => setOrdre(Number(e.target.value))} style={{ width: 70 }} />
      </td>
      <td>
        <input value={libelle} disabled={busy} onChange={(e) => setLibelle(e.target.value)} />
      </td>
      <td className="mono">{niveau.cle}</td>
      <td>
        <span className={`badge ${niveau.actif ? "badge-ok" : "badge-mut"}`}>{niveau.actif ? "Actif" : "Retiré"}</span>
      </td>
      <td>
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          {dirty && (
            <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void run(() => updateNiveau(token, niveau.cle, { libelle: libelle.trim(), ordre }))}>
              Enregistrer
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void run(() => updateNiveau(token, niveau.cle, { actif: !niveau.actif }))}>
            {niveau.actif ? "Désactiver" : "Réactiver"}
          </button>
          {niveau.actif && (
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void run(() => deleteNiveau(token, niveau.cle))}>
              Retirer
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
