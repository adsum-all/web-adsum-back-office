import { useState } from "react";

import { ApiError, type BulkResult, bulkCreateUtilisateurs } from "../api.js";

const ROLES: [string, string][] = [
  ["direction", "Acces membre (direction)"],
  ["controleur", "Controleur"],
  ["gestionnaire", "Gestionnaire (berger)"],
  ["admin", "Administrateur"],
];

function tempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  const rnd = crypto.getRandomValues(new Uint32Array(12));
  for (const r of rnd) out += chars[r % chars.length];
  return out;
}

function parseEmails(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)),
    ),
  );
}

export function ComptesMasse({ token }: { token: string }): JSX.Element {
  const [raw, setRaw] = useState("");
  const [role, setRole] = useState("direction");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string }[]>([]);

  const emails = parseEmails(raw);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (emails.length === 0) {
      setError("Aucun email valide detecte.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    const comptes = emails.map((email) => ({ email, password: tempPassword(), role }));
    try {
      const res = await bulkCreateUtilisateurs(token, comptes);
      setResult(res);
      const dup = new Set(res.doublons);
      setCredentials(comptes.filter((c) => !dup.has(c.email)).map((c) => ({ email: c.email, password: c.password })));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur reseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Creation de comptes en masse</h1>
          <p className="muted">
            L'admin cree les comptes d'acces (pas les profils). Une ligne = une personne, email unique.
          </p>
        </div>
      </header>

      <form className="form-card" onSubmit={submit}>
        <label className="full">
          <span>Emails (un par ligne, ou separes par virgule)</span>
          <textarea
            className="textarea"
            rows={8}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={"membre1@email.com\nmembre2@email.com"}
          />
        </label>
        <div className="row">
          <label>
            <span>Role attribue</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <span className="muted small">{emails.length} email(s) valide(s) detecte(s)</span>
        </div>
        {error && <p className="banner banner-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy || emails.length === 0}>
            {busy ? "Creation..." : "Creer les comptes"}
          </button>
        </div>
      </form>

      {result && (
        <section className="card">
          <h2 className="card-title">Resultat</h2>
          <div className="kpi-grid">
            <div className="kpi"><span className="kpi-label">Comptes crees</span><span className="kpi-value">{result.crees}</span></div>
            <div className="kpi"><span className="kpi-label">Doublons</span><span className="kpi-value">{result.doublons.length}</span></div>
            <div className="kpi"><span className="kpi-label">Erreurs</span><span className="kpi-value">{result.erreurs.length}</span></div>
          </div>
          {credentials.length > 0 && (
            <>
              <p className="muted small">Mots de passe temporaires (a distribuer, valables une fois, a changer a la premiere connexion) :</p>
              <ul className="list">
                {credentials.map((c) => (
                  <li key={c.email} className="list-row">
                    <span>{c.email}</span>
                    <span className="mono">{c.password}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}
