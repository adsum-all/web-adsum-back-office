import { useState } from "react";

import {
  ApiError,
  type FonctionCreateInput,
  type FonctionDependances,
  type FonctionHonorifique,
  createFonction,
  deleteFonction,
  getFonctionDependances,
  getFonctions,
  reaffecterFonction,
  supprimerFonctionDefinitif,
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
export function Fonctions({ token, canGerer = true }: { token: string; canGerer?: boolean }): JSX.Element {
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
            Catalogue des fonctions de responsabilité (responsable de commission, coordinateur, intendant...) proposées aux
            membres. Le libellé est choisi selon le genre. Le titre de consécration Berger/Bergère est distinct et se gère
            sur la fiche du membre.
          </p>
        </div>
      </header>

      <p className="muted small">
        L'option VIP détermine si les membres portant cette fonction apparaissent par défaut dans les calendriers
        d'anniversaire des autres membres.
      </p>

      {!canGerer && (
        <p className="banner banner-info small">
          Vous consultez ce catalogue en lecture seule. La modification requiert la permission
          <span className="mono"> fonctions.gerer</span>.
        </p>
      )}

      {canGerer && (
      <form className="form-card" onSubmit={submit}>
        <div className="form-grid">
          <label>
            <span>Clé *</span>
            <input value={form.cle} onChange={(e) => set("cle", e.target.value)} placeholder="responsable_commission" required />
          </label>
          <label>
            <span>Libellé (homme) *</span>
            <input value={form.libelle_h} onChange={(e) => set("libelle_h", e.target.value)} placeholder="Responsable" required />
          </label>
          <label>
            <span>Libellé (femme) *</span>
            <input value={form.libelle_f} onChange={(e) => set("libelle_f", e.target.value)} placeholder="Responsable" required />
          </label>
          <label>
            <span>Libellé neutre</span>
            <input value={form.libelle_n} onChange={(e) => set("libelle_n", e.target.value)} placeholder="Responsable" />
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
            {busy ? "Création..." : "+ Nouvelle fonction"}
          </button>
        </div>
      </form>
      )}

      {fonctions.error && <p className="banner banner-error">{fonctions.error}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Clé</th>
              <th>Libellé (H)</th>
              <th>Libellé (F)</th>
              <th>Neutre</th>
              <th>
                VIP
                <InfoTip text="Si actif, les membres portant cette fonction apparaissent par défaut dans les calendriers d'anniversaire." />
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
              <FonctionRow key={f.cle} token={token} fonction={f} canGerer={canGerer} onChanged={fonctions.reload} />
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
  canGerer,
  onChanged,
}: {
  token: string;
  fonction: FonctionHonorifique;
  canGerer: boolean;
  onChanged: () => void;
}): JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  // Deactivation AND definitive deletion go through a holder analysis: null = closed,
  // else the resolver is open with how many members hold this title, the reassignment
  // targets, and which action (reversible deactivation vs irreversible hard delete) the
  // resolution will finalise.
  const [deps, setDeps] = useState<FonctionDependances | null>(null);
  const [intent, setIntent] = useState<"desactiver" | "definitif">("desactiver");
  const [cible, setCible] = useState("");
  // On-page confirmation for an irreversible definitive delete with no dependency,
  // shown as a banner in the row rather than a native browser dialog.
  const [confirmDef, setConfirmDef] = useState(false);
  const [draft, setDraft] = useState({
    libelle_h: fonction.libelle_h,
    libelle_f: fonction.libelle_f,
    libelle_n: fonction.libelle_n,
    ordre: fonction.ordre,
  });

  // Finalise the chosen action once there is no holder left to break.
  async function finaliser(mode: "desactiver" | "definitif"): Promise<void> {
    if (mode === "definitif") await supprimerFonctionDefinitif(token, fonction.cle);
    else await deleteFonction(token, fonction.cle);
  }

  // Open the resolver for the chosen action: how many members currently hold this title?
  // With zero holders the action runs immediately (a hard delete asks to confirm first,
  // since it is irreversible); otherwise the reassignment resolver opens.
  async function ouvrirResolveur(mode: "desactiver" | "definitif"): Promise<void> {
    setBusy(true); setError(null);
    try {
      const d = await getFonctionDependances(token, fonction.cle);
      if (d.porteurs === 0) {
        if (mode === "definitif") {
          // No holders: ask for an explicit on-page confirmation before the irreversible delete.
          setConfirmDef(true);
          return;
        }
        await finaliser(mode);
        onChanged();
      } else {
        setDeps(d); setIntent(mode); setCible("");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  async function reaffecterEtFinaliser(detacher: boolean): Promise<void> {
    setBusy(true); setError(null);
    try {
      await reaffecterFonction(token, fonction.cle, detacher ? null : (cible || null));
      await finaliser(intent);
      onChanged();
      setDeps(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  // Any action reports its outcome: a swallowed 403/409/network error used to make
  // the buttons look dead. On success the list reloads; on failure the reason shows.
  async function run(action: () => Promise<unknown>, after?: () => void): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
      after?.();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(): void {
    setDraft({ libelle_h: fonction.libelle_h, libelle_f: fonction.libelle_f, libelle_n: fonction.libelle_n, ordre: fonction.ordre });
    setError(null);
    setEditing(true);
  }

  if (editing) {
    return (
      <tr>
        <td className="mono">{fonction.cle}</td>
        <td>
          <input value={draft.libelle_h} onChange={(e) => setDraft((d) => ({ ...d, libelle_h: e.target.value }))} />
        </td>
        <td>
          <input value={draft.libelle_f} onChange={(e) => setDraft((d) => ({ ...d, libelle_f: e.target.value }))} />
        </td>
        <td>
          <input value={draft.libelle_n} onChange={(e) => setDraft((d) => ({ ...d, libelle_n: e.target.value }))} />
        </td>
        <td>
          <span className={`pill ${fonction.est_vip ? "pill-on" : "pill-off"}`}>{fonction.est_vip ? "VIP" : "Standard"}</span>
        </td>
        <td>
          <input type="number" style={{ width: 64 }} value={draft.ordre} onChange={(e) => setDraft((d) => ({ ...d, ordre: Number(e.target.value) }))} />
        </td>
        <td>
          <span className={`badge ${fonction.actif ? "badge-ok" : "badge-mut"}`}>{fonction.actif ? "Actif" : "Désactivé"}</span>
        </td>
        <td>
          <div className="row-actions">
            <button
              type="button"
              className="btn btn-primary btn-inline"
              disabled={busy || !draft.libelle_h.trim() || !draft.libelle_f.trim()}
              onClick={() =>
                void run(
                  () =>
                    updateFonction(token, fonction.cle, {
                      libelle_h: draft.libelle_h.trim(),
                      libelle_f: draft.libelle_f.trim(),
                      libelle_n: draft.libelle_n.trim() || draft.libelle_h.trim(),
                      ordre: draft.ordre,
                    }),
                  () => setEditing(false),
                )
              }
            >
              {busy ? "..." : "Enregistrer"}
            </button>
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => { setEditing(false); setError(null); }}>
              Annuler
            </button>
          </div>
          {error && <p className="banner banner-error small">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td className="mono">{fonction.cle}</td>
      <td>{fonction.libelle_h}</td>
      <td>{fonction.libelle_f}</td>
      <td>{fonction.libelle_n}</td>
      <td>
        {canGerer ? (
          <button
            type="button"
            className={`pill ${fonction.est_vip ? "pill-on" : "pill-off"}`}
            disabled={busy}
            onClick={() => void run(() => updateFonction(token, fonction.cle, { est_vip: !fonction.est_vip }))}
          >
            {fonction.est_vip ? "VIP" : "Standard"}
          </button>
        ) : (
          <span className={`pill ${fonction.est_vip ? "pill-on" : "pill-off"}`}>{fonction.est_vip ? "VIP" : "Standard"}</span>
        )}
      </td>
      <td>{fonction.ordre}</td>
      <td>
        <span className={`badge ${fonction.actif ? "badge-ok" : "badge-mut"}`}>
          {fonction.actif ? "Actif" : "Désactivé"}
        </span>
      </td>
      <td>
        {canGerer ? (
          <>
            <div className="row-actions">
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={startEdit}>
                Modifier
              </button>
              {fonction.actif ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-inline"
                  disabled={busy}
                  onClick={() => void ouvrirResolveur("desactiver")}
                >
                  Désactiver
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-inline"
                  disabled={busy}
                  onClick={() => void run(() => updateFonction(token, fonction.cle, { actif: true }))}
                >
                  Réactiver
                </button>
              )}
              <button
                type="button"
                className="btn btn-danger btn-inline"
                disabled={busy}
                title="Retirer définitivement ce titre du catalogue (irréversible)"
                onClick={() => void ouvrirResolveur("definitif")}
              >
                Supprimer définitivement
              </button>
            </div>
            {deps && (
              <div className={`banner ${intent === "definitif" ? "banner-error" : "banner-info"} small`} style={{ textAlign: "left", marginTop: 6 }}>
                <strong>{deps.porteurs} membre(s) portent ce titre</strong>
                {deps.echantillon.length > 0 && <span className="muted"> (ex : {deps.echantillon.slice(0, 3).join(", ")}{deps.porteurs > 3 ? "…" : ""})</span>}
                <div className="muted" style={{ marginTop: 4 }}>
                  {intent === "definitif"
                    ? "Réaffectez ou détachez ces porteurs, puis la suppression définitive (irréversible) sera possible."
                    : "Réaffectez ou détachez ces porteurs, puis le titre sera désactivé."}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                  <select className="search" style={{ maxWidth: 200 }} value={cible} disabled={busy} onChange={(e) => setCible(e.target.value)}>
                    <option value="">- choisir une fonction cible -</option>
                    {deps.cibles.map((c) => <option key={c.cle} value={c.cle}>{c.nom}</option>)}
                  </select>
                  <button type="button" className={`btn ${intent === "definitif" ? "btn-danger" : "btn-primary"} btn-inline`} disabled={busy || !cible} onClick={() => void reaffecterEtFinaliser(false)}>
                    {intent === "definitif" ? "Réaffecter puis supprimer" : "Réaffecter puis désactiver"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void reaffecterEtFinaliser(true)}>
                    {intent === "definitif" ? "Retirer à tous puis supprimer" : "Retirer à tous puis désactiver"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setDeps(null)}>Annuler</button>
                </div>
              </div>
            )}
            {confirmDef && (
              <div className="banner banner-error small" style={{ textAlign: "left", marginTop: 6 }}>
                <strong>Supprimer définitivement le titre « {fonction.libelle_h} » ?</strong>
                <div className="muted" style={{ marginTop: 4 }}>Cette action est irréversible.</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-danger btn-inline" disabled={busy}
                    onClick={() => void run(() => supprimerFonctionDefinitif(token, fonction.cle), () => setConfirmDef(false))}>
                    Supprimer définitivement
                  </button>
                  <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setConfirmDef(false)}>Annuler</button>
                </div>
              </div>
            )}
            {error && <p className="banner banner-error small">{error}</p>}
          </>
        ) : (
          <span className="muted small">Lecture seule</span>
        )}
      </td>
    </tr>
  );
}
