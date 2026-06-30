import { useState } from "react";

import { ApiError, createCommission, getCommissions } from "../api.js";
import { useResource } from "../useResource.js";
import { OrgItemRow } from "./OrgItemRow.js";

export function Commissions({ token }: { token: string }): JSX.Element {
  const commissions = useResource(() => getCommissions(token), [token]);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!nom.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createCommission(token, { nom: nom.trim(), description: description.trim() || undefined });
      setNom("");
      setDescription("");
      commissions.reload();
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
          <h1>Commissions & groupes</h1>
          <p className="muted">Une commission a un libelle et un responsable; un membre y appartient.</p>
        </div>
      </header>

      <form className="form-card" onSubmit={submit}>
        <div className="form-grid">
          <label>
            <span>Nom de la commission *</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} required />
          </label>
          <label>
            <span>Description</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
        {error && <p className="banner banner-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
            {busy ? "Creation..." : "+ Commission"}
          </button>
        </div>
      </form>

      {commissions.error && <p className="banner banner-error">{commissions.error}</p>}
      <ul className="list">
        {(commissions.data ?? []).map((c) => (
          <OrgItemRow
            key={c.id}
            token={token}
            entity="commissions"
            id={c.id}
            nom={c.nom}
            meta={c.description ?? undefined}
            publie={c.publie}
            onChanged={commissions.reload}
          />
        ))}
      </ul>
      {!commissions.loading && (commissions.data ?? []).length === 0 && (
        <p className="muted">Aucune commission. Creez la premiere.</p>
      )}
    </div>
  );
}
