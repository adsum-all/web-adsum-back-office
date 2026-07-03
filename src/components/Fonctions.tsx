import { useState } from "react";

import {
  ApiError,
  type FonctionCreateInput,
  type FonctionHonorifique,
  createFonction,
  deleteFonction,
  getFonctions,
  updateFonction,
} from "../api.js";
import { useResource } from "../useResource.js";
import { InfoTip } from "./InfoTip.js";

const EMPTY: FonctionCreateInput = {
  cle: "",
  libelle_h: "",
  libelle_f: "",
  libelle_n: "",
  est_vip: false,
  ordre: 0,
};

/** CRUD editor for the honorific-function catalogue (titles used before names). */
export function Fonctions({ token }: { token: string }): JSX.Element {
  const fonctions = useResource(() => getFonctions(token), [token]);
  const [form, setForm] = useState<FonctionCreateInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FonctionCreateInput>(key: K, value: FonctionCreateInput[K]): void {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!form.cle.trim() || !form.libelle_h.trim() || !form.libelle_f.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createFonction(token, {
        cle: form.cle.trim(),
        libelle_h: form.libelle_h.trim(),
        libelle_f: form.libelle_f.trim(),
        libelle_n: form.libelle_n.trim() || form.libelle_h.trim(),
        est_vip: form.est_vip,
        ordre: form.ordre,
      });
      setForm(EMPTY);
      fonctions.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Fonctions & titres</h1>
          <p className="muted">
            Catalogue des titres honorifiques (Berger, Patriarche...) proposes aux membres. Le libelle est choisi selon le
            genre.
          </p>
        </div>
      </header>

      <p className="muted small">
        L'option VIP determine si les membres portant cette fonction apparaissent par defaut dans les calendriers
        d'anniversaire des autres membres.
      </p>

      <form className="form-card" onSubmit={submit}>
        <div className="form-grid">
          <label>
            <span>Cle *</span>
            <input value={form.cle} onChange={(e) => set("cle", e.target.value)} placeholder="berger" required />
          </label>
          <label>
            <span>Libelle (homme) *</span>
            <input value={form.libelle_h} onChange={(e) => set("libelle_h", e.target.value)} placeholder="Berger" required />
          </label>
          <label>
            <span>Libelle (femme) *</span>
            <input value={form.libelle_f} onChange={(e) => set("libelle_f", e.target.value)} placeholder="Bergere" required />
          </label>
          <label>
            <span>Libelle neutre</span>
            <input value={form.libelle_n} onChange={(e) => set("libelle_n", e.target.value)} placeholder="Berger(e)" />
          </label>
          <label>
            <span>Ordre</span>
            <input type="number" value={form.ordre} onChange={(e) => set("ordre", Number(e.target.value))} />
          </label>
          <label className="check" style={{ alignSelf: "end" }}>
            <input type="checkbox" checked={form.est_vip} onChange={(e) => set("est_vip", e.target.checked)} />
            VIP (calendriers d'anniversaire)
          </label>
        </div>
        {error && <p className="banner banner-error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy}>
            {busy ? "Creation..." : "+ Nouvelle fonction"}
          </button>
        </div>
      </form>

      {fonctions.error && <p className="banner banner-error">{fonctions.error}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Cle</th>
              <th>Libelle (H)</th>
              <th>Libelle (F)</th>
              <th>Neutre</th>
              <th>
                VIP
                <InfoTip text="Si actif, les membres portant cette fonction apparaissent par defaut dans les calendriers d'anniversaire." />
              </th>
              <th>Ordre</th>
              <th>Actif</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {fonctions.loading && (
              <tr>
                <td colSpan={8} className="muted">
                  Chargement...
                </td>
              </tr>
            )}
            {!fonctions.loading && (fonctions.data ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="muted">
                  Aucune fonction.
                </td>
              </tr>
            )}
            {(fonctions.data ?? []).map((f) => (
              <FonctionRow key={f.cle} token={token} fonction={f} onChanged={fonctions.reload} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FonctionRow({
  token,
  fonction,
  onChanged,
}: {
  token: string;
  fonction: FonctionHonorifique;
  onChanged: () => void;
}): JSX.Element {
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

  return (
    <tr>
      <td className="mono">{fonction.cle}</td>
      <td>{fonction.libelle_h}</td>
      <td>{fonction.libelle_f}</td>
      <td>{fonction.libelle_n}</td>
      <td>
        <button
          type="button"
          className={`pill ${fonction.est_vip ? "pill-on" : "pill-off"}`}
          disabled={busy}
          onClick={() => void run(() => updateFonction(token, fonction.cle, { est_vip: !fonction.est_vip }))}
        >
          {fonction.est_vip ? "VIP" : "Standard"}
        </button>
      </td>
      <td>{fonction.ordre}</td>
      <td>
        <span className={`badge ${fonction.actif ? "badge-ok" : "badge-mut"}`}>
          {fonction.actif ? "Actif" : "Retire"}
        </span>
      </td>
      <td>
        {fonction.actif && (
          <button
            type="button"
            className="btn btn-ghost btn-inline"
            disabled={busy}
            onClick={() => void run(() => deleteFonction(token, fonction.cle))}
          >
            Retirer
          </button>
        )}
      </td>
    </tr>
  );
}
