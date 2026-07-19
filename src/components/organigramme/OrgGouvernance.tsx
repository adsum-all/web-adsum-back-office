import { useEffect, useMemo, useState } from "react";

import {
  ApiError,
  type CoherenceFinding,
  type FonctionHonorifique,
  type Interim,
  type MembreProfile,
  annulerInterim,
  creerInterim,
  getFonctions,
  getMembres,
  getRapportCoherence,
  listInterims,
  terminerInterim,
} from "../../api.js";
import { useResource } from "../../useResource.js";
import "./organigramme-gouvernance.css";

/**
 * Governance panel of the org chart: the coherence report over the real
 * organisation data (units without a leader, vacant or duplicated apex posts,
 * open interims, members without attachment) and the interim (suppleance)
 * management, so the direction audits and formalises stand-ins before publishing.
 */
const NIVEAU_META: Record<CoherenceFinding["niveau"], { label: string; cls: string }> = {
  bloquant: { label: "Bloquant", cls: "gouv-chip-bloquant" },
  avertissement: { label: "Avertissement", cls: "gouv-chip-warn" },
  info: { label: "Information", cls: "gouv-chip-info" },
};

function nomMembre(m: MembreProfile): string {
  return m.nom_affichage || `${m.prenoms ?? ""} ${m.nom ?? ""}`.trim() || m.matricule;
}

function MembrePicker({
  token,
  label,
  requis,
  selection,
  onSelect,
}: {
  token: string;
  label: string;
  requis?: boolean;
  selection: MembreProfile | null;
  onSelect: (m: MembreProfile | null) => void;
}): JSX.Element {
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<MembreProfile[]>([]);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!ouvert || q.trim().length < 2) {
      setResultats([]);
      return;
    }
    let alive = true;
    const timer = setTimeout(() => {
      void getMembres(token, { q: q.trim(), limit: 8, statut: "actifs" })
        .then((r) => alive && setResultats(r))
        .catch(() => alive && setResultats([]));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q, ouvert, token]);

  if (selection) {
    return (
      <div className="gouv-field">
        <span className="gouv-label">{label}{requis ? " *" : ""}</span>
        <div className="gouv-picked">
          <span>{nomMembre(selection)}</span>
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => onSelect(null)}>
            Changer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="gouv-field">
      <span className="gouv-label">{label}{requis ? " *" : ""}</span>
      <input
        type="search"
        value={q}
        onFocus={() => setOuvert(true)}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un membre (nom, matricule)…"
        aria-label={label}
      />
      {ouvert && resultats.length > 0 ? (
        <ul className="gouv-suggestions">
          {resultats.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="gouv-suggestion"
                onClick={() => {
                  onSelect(m);
                  setQ("");
                  setOuvert(false);
                }}
              >
                <strong>{nomMembre(m)}</strong> <span className="muted small">{m.matricule}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function OrgGouvernance({ token }: { token: string }): JSX.Element {
  const coherence = useResource(() => getRapportCoherence(token), [token]);
  const interims = useResource(() => listInterims(token), [token]);
  const fonctions = useResource<FonctionHonorifique[]>(() => getFonctions(token), [token]);

  const [fonctionCle, setFonctionCle] = useState("");
  const [perimetre, setPerimetre] = useState("");
  const [suppleant, setSuppleant] = useState<MembreProfile | null>(null);
  const [titulaire, setTitulaire] = useState<MembreProfile | null>(null);
  const [motif, setMotif] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmFin, setConfirmFin] = useState<{ interim: Interim; action: "terminer" | "annuler" } | null>(null);

  const nomsFonctions = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of fonctions.data ?? []) map.set(f.cle.toLowerCase(), f.libelle_h);
    return map;
  }, [fonctions.data]);

  const actifs = (interims.data ?? []).filter((i) => i.statut === "actif");
  const historiques = (interims.data ?? []).filter((i) => i.statut !== "actif");

  function resetForm(): void {
    setFonctionCle("");
    setPerimetre("");
    setSuppleant(null);
    setTitulaire(null);
    setMotif("");
    setDateDebut("");
    setDateFin("");
  }

  async function soumettre(): Promise<void> {
    if (!fonctionCle || !suppleant) {
      setErreur("La fonction et le suppléant sont obligatoires.");
      return;
    }
    setBusy(true);
    setErreur(null);
    try {
      await creerInterim(token, {
        fonction_cle: fonctionCle,
        perimetre: perimetre.trim() || null,
        suppleant_id: suppleant.id,
        titulaire_id: titulaire?.id ?? null,
        motif: motif.trim() || null,
        date_debut: dateDebut || null,
        date_fin: dateFin || null,
      });
      resetForm();
      interims.reload();
      coherence.reload();
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  async function confirmerFin(): Promise<void> {
    if (!confirmFin) return;
    setBusy(true);
    setErreur(null);
    try {
      if (confirmFin.action === "terminer") await terminerInterim(token, confirmFin.interim.id);
      else await annulerInterim(token, confirmFin.interim.id);
      setConfirmFin(null);
      interims.reload();
      coherence.reload();
    } catch (e) {
      setErreur(e instanceof ApiError ? e.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  const libelle = (cle: string): string => nomsFonctions.get(cle.toLowerCase()) ?? cle;

  return (
    <div className="gouv-panel">
      {/* Coherence report */}
      <section className="card gouv-section">
        <div className="gouv-section-head">
          <h2>Rapport de cohérence</h2>
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => coherence.reload()} disabled={coherence.loading}>
            Actualiser
          </button>
        </div>
        <p className="muted small">
          Contrôle sur les données réelles de l'organisation, à consulter avant toute publication de l'organigramme.
        </p>
        {coherence.loading ? (
          <p className="muted">Analyse en cours…</p>
        ) : coherence.error ? (
          <p className="banner banner-error">{coherence.error}</p>
        ) : coherence.data ? (
          <>
            <div className="gouv-resume">
              <span className="gouv-chip gouv-chip-bloquant">{coherence.data.resume.bloquants} bloquant(s)</span>
              <span className="gouv-chip gouv-chip-warn">{coherence.data.resume.avertissements} avertissement(s)</span>
              <span className="gouv-chip gouv-chip-info">{coherence.data.resume.infos} information(s)</span>
            </div>
            {coherence.data.findings.length === 0 ? (
              <p className="muted">Aucune anomalie détectée. La structure est cohérente.</p>
            ) : (
              <ul className="gouv-findings">
                {coherence.data.findings.map((f) => (
                  <li key={f.code} className="gouv-finding">
                    <span className={`gouv-chip ${NIVEAU_META[f.niveau].cls}`}>{NIVEAU_META[f.niveau].label}</span>
                    <span>{f.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </section>

      {/* Interim management */}
      <section className="card gouv-section">
        <div className="gouv-section-head">
          <h2>Intérims et suppléances</h2>
        </div>
        <p className="muted small">
          Une suppléance datée place un membre sur une fonction dont le titulaire est absent. Tant qu'elle est active,
          la hiérarchie des membres affiche le suppléant « par intérim » ; le titulaire est rétabli à sa clôture.
        </p>

        {erreur ? <p className="banner banner-error">{erreur}</p> : null}

        <div className="gouv-form">
          <label className="gouv-field">
            <span className="gouv-label">Fonction *</span>
            <select value={fonctionCle} onChange={(e) => setFonctionCle(e.target.value)}>
              <option value="">Choisir une fonction…</option>
              {(fonctions.data ?? []).map((f) => (
                <option key={f.cle} value={f.cle}>
                  {f.libelle_h}
                </option>
              ))}
            </select>
          </label>
          <label className="gouv-field">
            <span className="gouv-label">Périmètre (facultatif)</span>
            <input value={perimetre} onChange={(e) => setPerimetre(e.target.value)} placeholder="Ex : Intendance ABOBO" />
          </label>
          <MembrePicker token={token} label="Suppléant" requis selection={suppleant} onSelect={setSuppleant} />
          <MembrePicker token={token} label="Titulaire habituel (facultatif)" selection={titulaire} onSelect={setTitulaire} />
          <label className="gouv-field">
            <span className="gouv-label">Motif (facultatif)</span>
            <input value={motif} onChange={(e) => setMotif(e.target.value)} maxLength={300} placeholder="Motif administratif, sans donnée personnelle sensible" />
          </label>
          <div className="gouv-dates">
            <label className="gouv-field">
              <span className="gouv-label">Début</span>
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </label>
            <label className="gouv-field">
              <span className="gouv-label">Fin (facultatif)</span>
              <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-primary btn-inline" onClick={() => void soumettre()} disabled={busy}>
              {busy ? "Enregistrement…" : "Créer la suppléance"}
            </button>
          </div>
        </div>

        <h3 className="gouv-subhead">Suppléances actives ({actifs.length})</h3>
        {interims.loading ? (
          <p className="muted">Chargement…</p>
        ) : actifs.length === 0 ? (
          <p className="muted">Aucune suppléance active.</p>
        ) : (
          <ul className="gouv-interims">
            {actifs.map((i) => (
              <li key={i.id} className="gouv-interim">
                <div>
                  <strong>{libelle(i.fonction_cle)}</strong>
                  {i.perimetre ? <span className="muted small"> · {i.perimetre}</span> : null}
                  <div className="muted small">
                    {i.date_debut ? `depuis le ${i.date_debut}` : ""}
                    {i.date_fin ? ` · jusqu'au ${i.date_fin}` : " · sans échéance"}
                    {i.motif ? ` · ${i.motif}` : ""}
                  </div>
                </div>
                <div className="gouv-interim-actions">
                  <button type="button" className="btn btn-ghost btn-inline" onClick={() => setConfirmFin({ interim: i, action: "terminer" })}>
                    Clôturer
                  </button>
                  <button type="button" className="btn btn-danger btn-inline" onClick={() => setConfirmFin({ interim: i, action: "annuler" })}>
                    Annuler
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {historiques.length > 0 ? (
          <>
            <h3 className="gouv-subhead">Historique ({historiques.length})</h3>
            <ul className="gouv-interims gouv-interims-hist">
              {historiques.map((i) => (
                <li key={i.id} className="gouv-interim">
                  <div>
                    <strong>{libelle(i.fonction_cle)}</strong>
                    {i.perimetre ? <span className="muted small"> · {i.perimetre}</span> : null}
                    <div className="muted small">
                      {i.statut === "termine" ? "Clôturé" : "Annulé"}
                      {i.date_fin ? ` le ${i.date_fin}` : ""}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      {confirmFin ? (
        <div className="org-modal-root" role="dialog" aria-modal="true" aria-label="Confirmer">
          <div className="org-modal-overlay" onClick={() => setConfirmFin(null)} aria-hidden="true" />
          <div className="org-modal">
            <h2 className="org-modal-title">{confirmFin.action === "terminer" ? "Clôturer la suppléance" : "Annuler la suppléance"}</h2>
            <p>
              {confirmFin.action === "terminer"
                ? "La suppléance sera clôturée à ce jour. Le titulaire est rétabli dans la hiérarchie des membres."
                : "La suppléance sera annulée. Utilisez cette action si elle a été créée par erreur."}
            </p>
            <div className="form-actions">
              <button type="button" className="btn btn-ghost btn-inline" onClick={() => setConfirmFin(null)}>
                Retour
              </button>
              <button
                type="button"
                className={`btn btn-inline ${confirmFin.action === "terminer" ? "btn-primary" : "btn-danger"}`}
                onClick={() => void confirmerFin()}
                disabled={busy}
              >
                {busy ? "…" : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
