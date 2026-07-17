import { useEffect, useMemo, useState } from "react";

import { type Evenement } from "../api.js";
import { type CalendarCell, dayKey, formatTime, monthGrid, monthLabel } from "../format.js";
import { EvenementGestion } from "./EvenementGestion.js";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

/** UNIVERSAL colour, identical in every app: the administrable event-type colour when
 * the activity has a type (each type has its own unique colour), otherwise a single
 * shared neutral. A cancelled activity is muted. */
export const COULEUR_SANS_TYPE = "#64748B";
function eventColor(ev: Evenement): string {
  if (ev.annule) return "var(--adsum-faint)";
  return ev.couleur || COULEUR_SANS_TYPE;
}

function modeLabel(mode: string | null | undefined): string {
  return mode === "en_ligne" ? "En ligne" : mode === "hybride" ? "Hybride" : "Présentiel";
}

/** Full French date of a "YYYY-MM-DD" key, e.g. "mardi 7 juillet 2026". */
function longDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
}

/** Premium month calendar for the back office: activities laid out on their day,
 * colour-coded by type, click a day to see its activities and manage each one
 * (session, questionnaire, cancel / reactivate / delete, attendance survey). */
export function CalendrierEvenements({
  token,
  evenements,
  canGerer = false,
  canSuperviser = false,
  onChanged,
}: {
  token: string;
  evenements: Evenement[];
  canGerer?: boolean;
  canSuperviser?: boolean;
  onChanged: () => void;
}): JSX.Element {
  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState<{ year: number; month: number }>({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<string>(dayKey(now));
  const [openId, setOpenId] = useState<string | null>(null);
  // The day agenda opens in a right-side drawer (Outlook style) rather than under
  // the grid, so the admin never leaves the calendar page.
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function openDay(key: string): void {
    setSelected(key);
    setOpenId(null);
    setDrawerOpen(true);
  }

  const cells: CalendarCell[] = useMemo(() => monthGrid(cursor.year, cursor.month), [cursor.year, cursor.month]);

  const byDay = useMemo(() => {
    const map = new Map<string, Evenement[]>();
    for (const ev of evenements) {
      const d = new Date(ev.debut);
      if (Number.isNaN(d.getTime())) continue;
      const k = dayKey(d);
      const list = map.get(k) ?? [];
      list.push(ev);
      map.set(k, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.debut.localeCompare(b.debut));
    return map;
  }, [evenements]);

  function shift(delta: number): void {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }
  function goToday(): void {
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelected(dayKey(now));
  }

  const selectedEvents = byDay.get(selected) ?? [];
  const todayKey = dayKey(now);

  return (
    <div>
      <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 12, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" className="btn btn-ghost btn-inline" aria-label="Mois précédent" onClick={() => shift(-1)}>‹</button>
          <button type="button" className="btn btn-ghost btn-inline" onClick={goToday}>Aujourd&apos;hui</button>
          <button type="button" className="btn btn-ghost btn-inline" aria-label="Mois suivant" onClick={() => shift(1)}>›</button>
        </div>
        <div style={{ fontWeight: 700, fontSize: 18, textTransform: "capitalize" }}>{monthLabel(cursor.year, cursor.month)}</div>
        <div style={{ fontSize: 11, color: "var(--adsum-mut)" }}>
          Couleur par type d&apos;événement (voir « Types d&apos;événements »)
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, marginBottom: 6 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--adsum-mut)" }}>{w}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6 }}>
        {cells.map((cell) => {
          const evs = byDay.get(cell.key) ?? [];
          const isSel = cell.key === selected;
          const isToday = cell.key === todayKey;
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => openDay(cell.key)}
              style={{
                minHeight: 96,
                textAlign: "left",
                padding: 6,
                borderRadius: 10,
                border: isSel ? "2px solid var(--adsum-acc)" : isToday ? "1.5px solid var(--adsum-acc)" : "1px solid var(--adsum-line)",
                background: cell.inMonth ? "var(--adsum-panel)" : "var(--adsum-bg)",
                color: cell.inMonth ? "var(--adsum-ink)" : "var(--adsum-faint)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 3,
                overflow: "hidden",
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: isToday ? 700 : 600, alignSelf: "flex-end", color: isToday ? "var(--adsum-acc)" : undefined }}>
                {cell.day}
              </span>
              {evs.slice(0, 3).map((ev) => (
                <span
                  key={ev.id}
                  title={`${ev.type_evenement_nom ? ev.type_evenement_nom + " - " : ""}${ev.titre}`}
                  style={{
                    fontSize: 10.5,
                    borderRadius: 5,
                    padding: "1px 5px",
                    color: "#fff",
                    background: eventColor(ev),
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textDecoration: ev.annule ? "line-through" : "none",
                    opacity: ev.annule ? 0.75 : 1,
                  }}
                >
                  {ev.type_evenement_nom && <strong>{ev.type_evenement_nom} · </strong>}
                  {formatTime(ev.debut)} {ev.titre}
                </span>
              ))}
              {evs.length > 3 && <span style={{ fontSize: 9.5, color: "var(--adsum-mut)" }}>+{evs.length - 3} autre(s)</span>}
            </button>
          );
        })}
      </div>

      {drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(9,12,20,0.4)", zIndex: 40 }}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label={`Activités du ${longDay(selected)}`}
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              zIndex: 50,
              width: "min(560px, 100%)",
              background: "var(--adsum-panel)",
              borderLeft: "1px solid var(--adsum-line)",
              boxShadow: "-14px 0 44px rgba(9,12,20,0.20)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--adsum-line)" }}>
              <div>
                <h3 className="card-title" style={{ margin: 0, textTransform: "capitalize" }}>{longDay(selected)}</h3>
                <span className="muted small">{selectedEvents.length} activité(s)</span>
              </div>
              <button type="button" className="btn btn-ghost btn-inline" onClick={() => setDrawerOpen(false)} aria-label="Fermer le panneau">Fermer</button>
            </div>
            <div style={{ overflowY: "auto", padding: 18, flex: 1 }}>
              {selectedEvents.length === 0 ? (
                <p className="muted">Aucune activité ce jour. Fermez ce panneau pour choisir un autre jour ou créer une activité.</p>
              ) : (
                selectedEvents.map((ev) => (
                  <section className="card" key={ev.id} style={{ marginBottom: 12 }}>
                    <div className="list-row" style={{ border: "none", background: "transparent", padding: 0, flexWrap: "wrap", gap: 8 }}>
                      <div className="event-main">
                        <strong style={{ textDecoration: ev.annule ? "line-through" : "none" }}>{ev.titre}</strong>
                        <span className="muted">
                          {formatTime(ev.debut)}
                          {ev.fin ? ` - ${formatTime(ev.fin)}` : ""}
                          {ev.lieu ? ` · ${ev.lieu}` : ""}
                        </span>
                      </div>
                      <div className="list-meta">
                        {ev.annule && <span className="badge badge-warn">Annulé</span>}
                        {ev.session_ouverte && <span className="badge badge-ok">Session ouverte</span>}
                        {ev.mode && <span className="badge badge-mut">{modeLabel(ev.mode)}</span>}
                        {ev.cible_type && ev.cible_type !== "general" && (
                          <span className="badge badge-warn">Réservé : {ev.cible_libelle ?? ev.cible_type}</span>
                        )}
                        <span className="badge badge-mut">Volet {ev.volet}</span>
                        <button type="button" className="btn btn-ghost btn-inline" onClick={() => setOpenId(openId === ev.id ? null : ev.id)}>
                          {openId === ev.id ? "Fermer" : "Gérer"}
                        </button>
                      </div>
                    </div>
                    {openId === ev.id && <EvenementGestion token={token} evenement={ev} canGerer={canGerer} canSuperviser={canSuperviser} onChanged={onChanged} />}
                  </section>
                ))
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

