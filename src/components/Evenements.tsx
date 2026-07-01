import { useState } from "react";

import {
  ApiError,
  type EvenementCreateInput,
  createEvenement,
  getEvenements,
  getQuestionnaireFenetre,
  setQuestionnaireFenetre,
} from "../api.js";
import { formatDate } from "../format.js";
import { useResource } from "../useResource.js";
import { EvenementGestion } from "./EvenementGestion.js";

const EMPTY: EvenementCreateInput = {
  titre: "",
  volet: "A",
  debut: "",
  type: "rassemblement",
  mode: "presentiel",
  type_diffusion: "aucun",
  visibilite: "membres",
};

export function Evenements({ token }: { token: string }): JSX.Element {
  const evenements = useResource(() => getEvenements(token), [token]);
  const fenetre = useResource(() => getQuestionnaireFenetre(token), [token]);
  const [form, setForm] = useState<EvenementCreateInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  function saveFenetre(heures: number): void {
    void setQuestionnaireFenetre(token, heures).then(() => fenetre.reload()).catch(() => undefined);
  }

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
        type: form.type,
        mode: form.mode,
        type_diffusion: form.type_diffusion,
        visibilite: form.visibilite,
      };
      if (form.fin) payload.fin = new Date(form.fin).toISOString();
      if (form.lieu?.trim()) payload.lieu = form.lieu.trim();
      if (form.lien_session?.trim()) payload.lien_session = form.lien_session.trim();
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
            <span>Type</span>
            <select value={form.type ?? "rassemblement"} onChange={(e) => set("type", e.target.value)}>
              <option value="rassemblement">Rassemblement</option>
              <option value="formation">Formation</option>
              <option value="priere">Priere</option>
            </select>
          </label>
          <label>
            <span>Mode</span>
            <select value={form.mode ?? "presentiel"} onChange={(e) => set("mode", e.target.value)}>
              <option value="presentiel">Presentiel</option>
              <option value="hybride">Hybride</option>
              <option value="distanciel">Distanciel</option>
            </select>
          </label>
          <label>
            <span>Diffusion</span>
            <select
              value={form.type_diffusion ?? "aucun"}
              onChange={(e) => set("type_diffusion", e.target.value as EvenementCreateInput["type_diffusion"])}
            >
              <option value="aucun">Aucune</option>
              <option value="embed">Diffusion integree (embed)</option>
              <option value="externe">Lien externe</option>
            </select>
          </label>
          <label>
            <span>Visibilite</span>
            <select
              value={form.visibilite ?? "membres"}
              onChange={(e) => set("visibilite", e.target.value as EvenementCreateInput["visibilite"])}
            >
              <option value="public">Public</option>
              <option value="membres">Membres</option>
              <option value="prive">Prive</option>
            </select>
          </label>
          <label>
            <span>Lieu</span>
            <input value={form.lieu ?? ""} onChange={(e) => set("lieu", e.target.value)} />
          </label>
          <label className="full">
            <span>Lien de session (Zoom, Meet...)</span>
            <input value={form.lien_session ?? ""} onChange={(e) => set("lien_session", e.target.value)} placeholder="https://..." />
          </label>
        </div>
        {error && <p className="banner banner-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
            {busy ? "Creation..." : "+ Nouvel evenement"}
          </button>
        </div>
      </form>

      <section className="card">
        <h2 className="card-title">Fenetre des questionnaires</h2>
        <p className="muted small">Duree, en heures apres la fin d'une session, pendant laquelle son questionnaire reste ouvert.</p>
        <div className="toolbar">
          <input
            type="range"
            min={1}
            max={72}
            step={1}
            value={fenetre.data?.heures ?? 6}
            onChange={(e) => saveFenetre(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span className="mono" style={{ minWidth: 56, textAlign: "right" }}>{fenetre.data?.heures ?? 6} h</span>
        </div>
      </section>

      {evenements.error && <p className="banner banner-error">{evenements.error}</p>}
      {(evenements.data ?? []).map((ev) => (
        <section className="card" key={ev.id}>
          <div className="list-row" style={{ border: "none", background: "transparent", padding: 0 }}>
            <div className="event-main">
              <strong>{ev.titre}</strong>
              <span className="muted">{formatDate(ev.debut)}</span>
            </div>
            <div className="list-meta">
              {ev.session_ouverte && <span className="badge badge-ok">Session ouverte</span>}
              {ev.lieu && <span className="muted">{ev.lieu}</span>}
              <span className="badge badge-mut">Volet {ev.volet}</span>
              <button
                type="button"
                className="btn btn-ghost btn-inline"
                onClick={() => setOpenId(openId === ev.id ? null : ev.id)}
              >
                {openId === ev.id ? "Fermer" : "Gerer la session"}
              </button>
            </div>
          </div>
          {openId === ev.id && <EvenementGestion token={token} evenement={ev} onChanged={evenements.reload} />}
        </section>
      ))}
      {!evenements.loading && (evenements.data ?? []).length === 0 && (
        <p className="muted">Aucun evenement.</p>
      )}
    </div>
  );
}
