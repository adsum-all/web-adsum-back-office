import { useState } from "react";

import {
  ApiError,
  type NiveauDependances,
  type NiveauEngagement,
  createNiveau,
  getNiveauDependances,
  getNiveaux,
  reaffecterNiveau,
  supprimerNiveauDefinitif,
  updateNiveau,
} from "../api.js";
import { useResource } from "../useResource.js";
import { InfoTip } from "./InfoTip.js";

function slugCle(v: string): string {
  const base = v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  // The backend key must start with a letter (^[a-z][a-z0-9_]{1,39}$): prefix a
  // leading digit with 'n' so a label like "3e cycle" still yields a valid key.
  return /^[0-9]/.test(base) ? `n${base}`.slice(0, 40) : base;
}

/**
 * Admin catalogue of engagement levels (membre.type_membre). The administration
 * creates, renames, reorders and deactivates levels without any code change; the
 * hierarchical order is the "ordre" column (lower first).
 */
export function Niveaux({ token, canGerer = true }: { token: string; canGerer?: boolean }): JSX.Element {
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

      {!canGerer && (
        <p className="banner banner-info small">
          Vous consultez ce catalogue en lecture seule. La modification requiert la permission
          <span className="mono"> niveaux-engagement.gerer</span>.
        </p>
      )}

      {canGerer && (
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
      )}

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
              <NiveauRow key={n.cle} token={token} niveau={n} canGerer={canGerer} onChanged={niveaux.reload} />
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
  canGerer,
  onChanged,
}: {
  token: string;
  niveau: NiveauEngagement;
  canGerer: boolean;
  onChanged: () => void;
}): JSX.Element {
  const [libelle, setLibelle] = useState(niveau.libelle);
  const [ordre, setOrdre] = useState(niveau.ordre);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deps, setDeps] = useState<NiveauDependances | null>(null);
  const [intent, setIntent] = useState<"desactiver" | "definitif">("desactiver");
  const [cible, setCible] = useState("");
  // On-page confirmation for an irreversible definitive delete with no member on the level.
  const [confirmDef, setConfirmDef] = useState(false);

  async function confirmerSuppressionDefinitive(): Promise<void> {
    setBusy(true); setError(null);
    try {
      await supprimerNiveauDefinitif(token, niveau.cle);
      setConfirmDef(false);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  // Finalise the chosen action once no member is left on this level.
  async function finaliser(mode: "desactiver" | "definitif"): Promise<void> {
    if (mode === "definitif") await supprimerNiveauDefinitif(token, niveau.cle);
    else await updateNiveau(token, niveau.cle, { actif: false });
  }

  // Open the resolver for the chosen action: how many members are on this level? With
  // zero members it runs immediately (a hard delete confirms first, being irreversible);
  // otherwise the reassignment resolver opens.
  async function ouvrirResolveur(mode: "desactiver" | "definitif"): Promise<void> {
    setBusy(true); setError(null);
    try {
      const d = await getNiveauDependances(token, niveau.cle);
      if (d.porteurs === 0) {
        if (mode === "definitif") {
          // No member on the level: ask for an explicit on-page confirmation.
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
      await reaffecterNiveau(token, niveau.cle, detacher ? null : (cible || null));
      await finaliser(intent);
      onChanged();
      setDeps(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  // Surface the outcome instead of swallowing it: a 403 (missing gerer) or a
  // network error used to leave the button silent, which read as "it does nothing".
  async function run(action: () => Promise<unknown>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  const dirty = libelle !== niveau.libelle || ordre !== niveau.ordre;

  return (
    <tr>
      <td style={{ width: 90 }}>
        <input type="number" value={ordre} disabled={busy || !canGerer} onChange={(e) => setOrdre(Number(e.target.value))} style={{ width: 70 }} />
      </td>
      <td>
        <input value={libelle} disabled={busy || !canGerer} onChange={(e) => setLibelle(e.target.value)} />
      </td>
      <td className="mono">{niveau.cle}</td>
      <td>
        <span className={`badge ${niveau.actif ? "badge-ok" : "badge-mut"}`}>{niveau.actif ? "Actif" : "Désactivé"}</span>
      </td>
      <td>
        {canGerer ? (
          <>
            <div className="row-actions">
              {dirty && (
                <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void run(() => updateNiveau(token, niveau.cle, { libelle: libelle.trim(), ordre }))}>
                  Enregistrer
                </button>
              )}
              {/* A single honest toggle. Deactivation first analyses the members on
                  this level and offers to reassign them (no FK: link by convention). */}
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy}
                onClick={() => (niveau.actif ? void ouvrirResolveur("desactiver") : void run(() => updateNiveau(token, niveau.cle, { actif: true })))}>
                {niveau.actif ? "Désactiver" : "Réactiver"}
              </button>
              <button type="button" className="btn btn-danger btn-inline" disabled={busy}
                title="Retirer définitivement ce niveau du catalogue (irréversible)"
                onClick={() => void ouvrirResolveur("definitif")}>
                Supprimer définitivement
              </button>
            </div>
            {deps && (
              <div className={`banner ${intent === "definitif" ? "banner-error" : "banner-info"} small`} style={{ textAlign: "left", marginTop: 6 }}>
                <strong>{deps.porteurs} membre(s) sur ce niveau</strong>
                {deps.echantillon.length > 0 && <span className="muted"> (ex : {deps.echantillon.slice(0, 3).join(", ")}{deps.porteurs > 3 ? "…" : ""})</span>}
                <div className="muted" style={{ marginTop: 4 }}>
                  {intent === "definitif"
                    ? "Réaffectez ou détachez ces membres, puis la suppression définitive (irréversible) sera possible."
                    : "Réaffectez ou détachez ces membres, puis le niveau sera désactivé."}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                  <select className="search" style={{ maxWidth: 200 }} value={cible} disabled={busy} onChange={(e) => setCible(e.target.value)}>
                    <option value="">- choisir un niveau cible -</option>
                    {deps.cibles.map((c) => <option key={c.cle} value={c.cle}>{c.nom}</option>)}
                  </select>
                  <button type="button" className={`btn ${intent === "definitif" ? "btn-danger" : "btn-primary"} btn-inline`} disabled={busy || !cible} onClick={() => void reaffecterEtFinaliser(false)}>
                    {intent === "definitif" ? "Réaffecter puis supprimer" : "Réaffecter puis désactiver"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void reaffecterEtFinaliser(true)}>
                    {intent === "definitif" ? "Retirer le niveau à tous puis supprimer" : "Retirer le niveau à tous puis désactiver"}
                  </button>
                  <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setDeps(null)}>Annuler</button>
                </div>
              </div>
            )}
            {confirmDef && (
              <div className="banner banner-error small" style={{ textAlign: "left", marginTop: 6 }}>
                <strong>Supprimer définitivement le niveau « {niveau.libelle} » ?</strong>
                <div className="muted" style={{ marginTop: 4 }}>Cette action est irréversible.</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  <button type="button" className="btn btn-danger btn-inline" disabled={busy} onClick={() => void confirmerSuppressionDefinitive()}>
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
