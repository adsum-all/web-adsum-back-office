import { useState } from "react";

import {
  ApiError,
  type Utilisateur,
  createUtilisateur,
  getUtilisateurs,
  updateUtilisateur,
} from "../api.js";
import { useResource } from "../useResource.js";

const ROLES: [string, string][] = [
  ["super_admin", "Super-admin"],
  ["admin", "Administrateur"],
  ["gestionnaire", "Gestionnaire (berger)"],
  ["controleur", "Controleur"],
  ["direction", "Direction"],
];

export function Utilisateurs({ token }: { token: string }): JSX.Element {
  const users = useResource(() => getUtilisateurs(token), [token]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("controleur");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function guard<T>(p: Promise<T>): void {
    setError(null);
    p.then(() => users.reload()).catch((e: unknown) =>
      setError(e instanceof ApiError ? e.message : "Erreur reseau"),
    );
  }

  async function invite(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!email.trim() || password.length < 8) {
      setError("Email requis et mot de passe d'au moins 8 caracteres.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createUtilisateur(token, { email: email.trim(), role, password });
      setEmail("");
      setPassword("");
      users.reload();
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
          <h1>Utilisateurs & roles</h1>
          <p className="muted">Moindre privilege : le super-admin cree les comptes et attribue les droits.</p>
        </div>
      </header>

      <form className="form-card" onSubmit={invite}>
        <div className="form-grid">
          <label className="full">
            <span>Courriel du nouveau compte</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nom@email.com" />
          </label>
          <label>
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Mot de passe temporaire</span>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caracteres minimum" />
          </label>
        </div>
        {error && <p className="banner banner-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
            {busy ? "Creation..." : "+ Inviter"}
          </button>
        </div>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Role</th>
              <th>2FA</th>
              <th>Etat</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.loading && (
              <tr>
                <td colSpan={5} className="muted">Chargement...</td>
              </tr>
            )}
            {(users.data ?? []).map((u) => (
              <Row key={u.id} u={u} onRole={(r) => guard(updateUtilisateur(token, u.id, { role: r }))} onToggle={() => guard(updateUtilisateur(token, u.id, { actif: !u.actif }))} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface RowProps {
  u: Utilisateur;
  onRole: (role: string) => void;
  onToggle: () => void;
}

function Row({ u, onRole, onToggle }: RowProps): JSX.Element {
  return (
    <tr>
      <td>
        <div className="event-main">
          <strong>{u.membre_nom ?? u.email}</strong>
          <span className="muted small">{u.email}</span>
        </div>
      </td>
      <td>
        <select value={u.role} onChange={(e) => onRole(e.target.value)}>
          {ROLES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </td>
      <td>{u.double_facteur ? "actif" : "-"}</td>
      <td>
        <span className={`badge ${u.actif ? "badge-ok" : "badge-warn"}`}>{u.actif ? "actif" : "inactif"}</span>
      </td>
      <td>
        <button type="button" className="link" onClick={onToggle}>
          {u.actif ? "Desactiver" : "Reactiver"}
        </button>
      </td>
    </tr>
  );
}
