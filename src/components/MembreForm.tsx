import { useState } from "react";

import { ApiError, type MembreCreateInput, createMembre, getCommissions } from "../api.js";
import { useResource } from "../useResource.js";

interface MembreFormProps {
  token: string;
  onDone: () => void;
  onCancel: () => void;
}

export function MembreForm({ token, onDone, onCancel }: MembreFormProps): JSX.Element {
  const commissions = useResource(() => getCommissions(token), [token]);
  const [form, setForm] = useState<MembreCreateInput>({ email: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof MembreCreateInput>(key: K, value: MembreCreateInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload: MembreCreateInput = { email: form.email.trim() };
      if (form.nom?.trim()) payload.nom = form.nom.trim();
      if (form.prenoms?.trim()) payload.prenoms = form.prenoms.trim();
      if (form.telephone?.trim()) payload.telephone = form.telephone.trim();
      if (form.groupe?.trim()) payload.groupe = form.groupe.trim();
      if (form.commission_id) payload.commission_id = form.commission_id;
      await createMembre(token, payload);
      onDone();
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
          <button type="button" className="link" onClick={onCancel}>
            Annuaire
          </button>
          <h1>Nouveau membre</h1>
          <p className="muted">Le matricule est genere automatiquement.</p>
        </div>
      </header>

      <form className="form-card" onSubmit={submit}>
        <div className="form-grid">
          <label className="full">
            <span>Courriel *</span>
            <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
          </label>
          <label>
            <span>Prenoms</span>
            <input value={form.prenoms ?? ""} onChange={(e) => set("prenoms", e.target.value)} />
          </label>
          <label>
            <span>Nom</span>
            <input value={form.nom ?? ""} onChange={(e) => set("nom", e.target.value)} />
          </label>
          <label>
            <span>Telephone</span>
            <input value={form.telephone ?? ""} onChange={(e) => set("telephone", e.target.value)} />
          </label>
          <label>
            <span>Groupe</span>
            <input value={form.groupe ?? ""} onChange={(e) => set("groupe", e.target.value)} />
          </label>
          <label className="full">
            <span>Commission</span>
            <select value={form.commission_id ?? ""} onChange={(e) => set("commission_id", e.target.value || undefined)}>
              <option value="">Aucune</option>
              {(commissions.data ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="banner banner-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn btn-ghost btn-inline" onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
            {busy ? "Creation..." : "Creer le membre"}
          </button>
        </div>
      </form>
    </div>
  );
}
