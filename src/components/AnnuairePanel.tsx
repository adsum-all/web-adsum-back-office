import { useEffect, useMemo, useState } from "react";

import {
  type Commission,
  type Coordination,
  type Intendance,
  type MembreProfile,
  type Tribu,
  getAnnuairePays,
  getCommissions,
  getCoordinations,
  getIntendances,
  getMembres,
  getTribus,
} from "../api.js";
import { civilName, initials, uniteLabel } from "../format.js";

interface Props {
  token: string;
  currentId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}

const LIMIT = 100;

/**
 * Right-side sliding directory drawer. It lets an authorised user browse, search and
 * filter the member directory and open another profile without leaving the one they
 * are on. It reuses the server directory endpoint (permission ``membres.gerer`` and
 * the same perimeter scoping as the main annuaire), so it never widens access.
 *
 * It is a CONTROLLED component: its open state lives in the parent container (which
 * stays mounted while the member detail reloads), so the drawer, its search and its
 * filters survive a profile switch and browsing stays fluid.
 */
export function AnnuairePanel({ token, currentId, open, onClose, onSelect }: Props): JSX.Element | null {
  const [showFilters, setShowFilters] = useState(false);

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [pays, setPays] = useState("");
  const [commissionId, setCommissionId] = useState("");
  const [intendanceId, setIntendanceId] = useState("");
  const [coordinationId, setCoordinationId] = useState("");
  const [tribuId, setTribuId] = useState("");

  const [paysList, setPaysList] = useState<string[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [intendances, setIntendances] = useState<Intendance[]>([]);
  const [coordinations, setCoordinations] = useState<Coordination[]>([]);
  const [tribus, setTribus] = useState<Tribu[]>([]);
  const [refsLoaded, setRefsLoaded] = useState(false);

  const [results, setResults] = useState<MembreProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the filter reference lists once, the first time the panel is opened.
  useEffect(() => {
    if (!open || refsLoaded) return;
    setRefsLoaded(true);
    void getAnnuairePays(token).then(setPaysList).catch(() => undefined);
    void getCommissions(token).then(setCommissions).catch(() => undefined);
    void getIntendances(token).then(setIntendances).catch(() => undefined);
    void getCoordinations(token).then(setCoordinations).catch(() => undefined);
    void getTribus(token).then(setTribus).catch(() => undefined);
  }, [open, refsLoaded, token]);

  // Debounce the free-text search so keystrokes do not spam the backend.
  useEffect(() => {
    const h = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(h);
  }, [q]);

  // Close on Escape for keyboard accessibility.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const activeFilters = useMemo(
    () => [pays, commissionId, intendanceId, coordinationId, tribuId].filter(Boolean).length,
    [pays, commissionId, intendanceId, coordinationId, tribuId],
  );

  // Fetch results whenever the panel is open and any query dimension changes.
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    getMembres(token, {
      q: debouncedQ || undefined,
      pays: pays || undefined,
      commission_id: commissionId || undefined,
      intendance_id: intendanceId || undefined,
      coordination_id: coordinationId || undefined,
      tribu_id: tribuId || undefined,
      limit: LIMIT,
    })
      .then((rows) => {
        if (active) setResults(rows);
      })
      .catch((e: unknown) => {
        if (active) setError(e instanceof Error ? e.message : "Annuaire indisponible.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open, token, debouncedQ, pays, commissionId, intendanceId, coordinationId, tribuId]);

  function reinitialiser(): void {
    setQ("");
    setDebouncedQ("");
    setPays("");
    setCommissionId("");
    setIntendanceId("");
    setCoordinationId("");
    setTribuId("");
  }

  function choisir(id: string): void {
    onSelect(id);
    // On a narrow screen the drawer covers the profile, so close it after picking.
    // On a wide screen it stays open so the user can keep switching profiles.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches) {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-label="Annuaire des membres">
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer-panel">
        <header className="drawer-head">
          <div>
            <h2 className="drawer-title">Annuaire</h2>
            <p className="muted small">Ouvrez une autre fiche sans quitter celle-ci.</p>
          </div>
          <button type="button" className="drawer-close" aria-label="Fermer le panneau" onClick={onClose}>
            &times;
          </button>
        </header>

            <div className="drawer-search">
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                className="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nom, matricule, code, courriel..."
                aria-label="Rechercher un membre"
                autoFocus
              />
              <button
                type="button"
                className={`btn btn-ghost btn-inline${showFilters ? " is-active" : ""}`}
                aria-expanded={showFilters}
                onClick={() => setShowFilters((s) => !s)}
              >
                Filtres{activeFilters ? ` (${activeFilters})` : ""}
              </button>
            </div>

            {showFilters && (
              <div className="drawer-filters">
                <select value={pays} onChange={(e) => setPays(e.target.value)} aria-label="Filtrer par pays">
                  <option value="">Tous les pays</option>
                  {paysList.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select value={coordinationId} onChange={(e) => setCoordinationId(e.target.value)} aria-label="Filtrer par coordination">
                  <option value="">Toutes les coordinations</option>
                  {coordinations.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
                <select value={intendanceId} onChange={(e) => setIntendanceId(e.target.value)} aria-label="Filtrer par intendance">
                  <option value="">Toutes les intendances</option>
                  {intendances.map((i) => (
                    <option key={i.id} value={i.id}>{i.nom}</option>
                  ))}
                </select>
                <select value={commissionId} onChange={(e) => setCommissionId(e.target.value)} aria-label="Filtrer par commission">
                  <option value="">Toutes les commissions</option>
                  {commissions.map((c) => (
                    <option key={c.id} value={c.id}>{uniteLabel(c)}</option>
                  ))}
                </select>
                <select value={tribuId} onChange={(e) => setTribuId(e.target.value)} aria-label="Filtrer par tribu">
                  <option value="">Toutes les tribus</option>
                  {tribus.map((t) => (
                    <option key={t.id} value={t.id}>{t.nom}</option>
                  ))}
                </select>
                {activeFilters > 0 && (
                  <button type="button" className="link drawer-reset" onClick={reinitialiser}>
                    Reinitialiser les filtres
                  </button>
                )}
              </div>
            )}

            <div className="drawer-list">
              {error && <p className="banner banner-error">{error}</p>}
              {loading && <p className="muted small drawer-empty">Chargement...</p>}
              {!loading && !error && results.length === 0 && (
                <p className="muted small drawer-empty">Aucun membre ne correspond a votre recherche.</p>
              )}
              {results.map((m) => {
                const nom = civilName(m, m.matricule);
                const meta = [m.commission, m.tribu ? `Tribu ${m.tribu}` : null, m.pays].filter(Boolean).join(" . ");
                return (
                  <button
                    key={m.id}
                    type="button"
                    className={`drawer-item${m.id === currentId ? " is-current" : ""}`}
                    onClick={() => choisir(m.id)}
                    aria-current={m.id === currentId ? "true" : undefined}
                  >
                    <span className="drawer-item-avatar" aria-hidden="true">{initials(nom)}</span>
                    <span className="drawer-item-body">
                      <span className="drawer-item-name">{nom}</span>
                      <span className="drawer-item-meta mono">{m.matricule}</span>
                      {meta && <span className="drawer-item-meta">{meta}</span>}
                    </span>
                    {m.id === currentId && <span className="drawer-item-tag">Fiche ouverte</span>}
                  </button>
                );
              })}
            </div>

        <footer className="drawer-foot muted small">
          {results.length} resultat(s){results.length >= LIMIT ? ", affinez la recherche pour tout voir" : ""}
        </footer>
      </aside>
    </div>
  );
}
