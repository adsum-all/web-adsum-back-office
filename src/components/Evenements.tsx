import { useState } from "react";

import { ApiError, type EvenementCreateInput, createEvenement, getEvenements } from "../api.js";
import { formatDate } from "../format.js";
import { useResource } from "../useResource.js";

const EMPTY: EvenementCreateInput = { titre: "", volet: "A", debut: "" };

export function Evenements({ token }: { token: string }): JSX.Element {
  const evenements = useResource(() => getEvenements(token), [token]);
  const [form, setForm] = useState<EvenementCreateInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof EvenementCreateInput>(key: K, value: EvenementCreateInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.titre.trim() || !form.debut) return;
    setBusy(true);
    setError(null);
    try {
      const payload: EvenementCreateInput = {
        titre: form.titre.trim(),
        volet: form.volet,
        debut: new Date(form.debut).toISOString(),
      };
      if (form.fin) payload.fin = new Date(form.fin).toISOString();
      if (form.lieu?.trim()) payload.lieu = form.lieu.trim();
      await createEvenement(token, payload);
      setForm(EMPTY);
      evenements.reload();
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
          <h1>Calendrier des evenements</h1>
          <p className="muted">Rencontres, formations, sessions en ligne.</p>
        </div>
      </header>

      <form className="form-card" onSubmit={submit}>
        <div className="form-grid">
          <label className="full">
            <span>Titre *</span>
            <input value={form.titre} onChange={(e) => set("titre", e.target.value)} required />
          </label>
          <label>
            <span>Debut *</span>
            <input type="datetime-local" value={form.debut} onChange={(e) => set("debut", e.target.value)} required />
          </label>
          <label>
            <span>Fin</span>
            <input type="datetime-local" value={form.fin ?? ""} onChange={(e) => set("fin", e.target.value)} />
          </label>
          <label>
            <span>Volet</span>
            <select value={form.volet} onChange={(e) => set("volet", e.target.value)}>
              <option value="A">A (membres)</option>
              <option value="B">B (grand public)</option>
            </select>
          </label>
          <label>
            <span>Lieu</span>
            <input value={form.lieu ?? ""} onChange={(e) => set("lieu", e.target.value)} />
          </label>
        </div>
        {error && <p className="banner banner-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
            {busy ? "Creation..." : "+ Nouvel evenement"}
          </button>
        </div>
      </form>

      {evenements.error && <p className="banner banner-error">{evenements.error}</p>}
      <ul className="list">
        {(evenements.data ?? []).map((ev) => (
          <li key={ev.id} className="list-row">
            <div className="event-main">
              <strong>{ev.titre}</strong>
              <span className="muted">{formatDate(ev.debut)}</span>
            </div>
            <div className="list-meta">
              {ev.lieu && <span className="muted">{ev.lieu}</span>}
              <span className="badge badge-mut">Volet {ev.volet}</span>
            </div>
          </li>
        ))}
      </ul>
      {!evenements.loading && (evenements.data ?? []).length === 0 && (
        <p className="muted">Aucun evenement.</p>
      )}
    </div>
  );
}
