import { useState } from "react";

import {
  ApiError,
  CATEGORIES_ATTRIBUTION,
  type FonctionDependances,
  type FonctionHonorifique,
  deleteFonction,
  getFonctionDependances,
  reaffecterFonction,
  supprimerFonctionDefinitif,
  updateFonction,
} from "../api.js";
import { CategorieBadge, categorieUtiliseAbreviation } from "./CategorieBadge.js";

/**
 * One catalogue attribution as a table row, with inline edition (libellés,
 * category, abbreviation, order) and the full lifecycle: VIP toggle, reversible
 * deactivation/reactivation, and irreversible definitive deletion, both routed
 * through a holder-dependency resolver (reassign to a same-category target or
 * detach all holders first).
 */
export function FonctionRow({
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
  // else the resolver is open with how many members hold this attribution, the
  // reassignment targets (same category only), and which action (reversible
  // deactivation vs irreversible hard delete) the resolution will finalise.
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
    categorie: fonction.categorie,
    abreviation: fonction.abreviation ?? "",
    ordre: fonction.ordre,
  });

  const draftUseAbreviation = categorieUtiliseAbreviation(draft.categorie);

  // Finalise the chosen action once there is no holder left to break.
  async function finaliser(mode: "desactiver" | "definitif"): Promise<void> {
    if (mode === "definitif") await supprimerFonctionDefinitif(token, fonction.cle);
    else await deleteFonction(token, fonction.cle);
  }

  // Open the resolver for the chosen action: how many members currently hold this
  // attribution? With zero holders the action runs immediately (a hard delete asks
  // to confirm first, since it is irreversible); otherwise the reassignment resolver
  // opens.
  async function ouvrirResolveur(mode: "desactiver" | "definitif"): Promise<void> {
    setBusy(true); setError(null);
    try {
      const d = await getFonctionDependances(token, fonction.cle);
      if (d.porteurs === 0) {
        if (mode === "definitif") {
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
    setDraft({
      libelle_h: fonction.libelle_h,
      libelle_f: fonction.libelle_f,
      libelle_n: fonction.libelle_n,
      categorie: fonction.categorie,
      abreviation: fonction.abreviation ?? "",
      ordre: fonction.ordre,
    });
    setError(null);
    setEditing(true);
  }

  if (editing) {
    return (
      <tr>
        <td className="mono">{fonction.cle}</td>
        <td>
          <select value={draft.categorie} onChange={(e) => setDraft((d) => ({ ...d, categorie: e.target.value }))}>
            {CATEGORIES_ATTRIBUTION.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </td>
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
          {draftUseAbreviation ? (
            <input
              style={{ width: 90 }}
              maxLength={12}
              placeholder="Resp."
              value={draft.abreviation}
              onChange={(e) => setDraft((d) => ({ ...d, abreviation: e.target.value }))}
            />
          ) : (
            <span className="muted">-</span>
          )}
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
                      categorie: draft.categorie,
                      abreviation: categorieUtiliseAbreviation(draft.categorie) ? draft.abreviation.trim() || null : null,
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
      <td>
        <CategorieBadge code={fonction.categorie} />
      </td>
      <td>{fonction.libelle_h}</td>
      <td>{fonction.libelle_f}</td>
      <td>{fonction.libelle_n}</td>
      <td>{fonction.abreviation ? <span className="mono">{fonction.abreviation}</span> : <span className="muted">-</span>}</td>
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
                title="Retirer définitivement cette attribution du catalogue (irréversible)"
                onClick={() => void ouvrirResolveur("definitif")}
              >
                Supprimer définitivement
              </button>
            </div>
            {deps && (
              <div className={`banner ${intent === "definitif" ? "banner-error" : "banner-info"} small`} style={{ textAlign: "left", marginTop: 6 }}>
                <strong>{deps.porteurs} membre(s) portent cette attribution</strong>
                {deps.echantillon.length > 0 && <span className="muted"> (ex : {deps.echantillon.slice(0, 3).join(", ")}{deps.porteurs > 3 ? "..." : ""})</span>}
                <div className="muted" style={{ marginTop: 4 }}>
                  {intent === "definitif"
                    ? "Réaffectez ou détachez ces porteurs, puis la suppression définitive (irréversible) sera possible."
                    : "Réaffectez ou détachez ces porteurs, puis l'attribution sera désactivée."}
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                  <select className="search" style={{ maxWidth: 220 }} value={cible} disabled={busy} onChange={(e) => setCible(e.target.value)}>
                    <option value="">- choisir une cible (même catégorie) -</option>
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
                <strong>Supprimer définitivement « {fonction.libelle_h} » ?</strong>
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
