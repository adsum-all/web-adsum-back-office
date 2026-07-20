import { useEffect, useState } from "react";

import { type ApercuCalendrier, type ReferenceCouleur, getApercuCalendrier, telechargerApercuICS } from "../../api.js";

/**
 * "Aperçu calendrier": for a chosen year, the computed reference-date occurrences
 * (institutional recurring + fixed feasts + movable feasts) with their colours and
 * badges, plus coherence alerts (collisions, missing description or colour). This is
 * exactly what members will see, so the direction can verify before publishing.
 */
const ANNEE_COURANTE = 2026; // stamped default; the picker lets the admin change it

export function InstitApercuTab({
  token,
  couleurs,
}: Readonly<{ token: string; couleurs: ReferenceCouleur[] }>): JSX.Element {
  const [annee, setAnnee] = useState(ANNEE_COURANTE);
  const [data, setData] = useState<ApercuCalendrier | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState<"tout" | "institution" | "liturgie">("tout");

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr(null);
    getApercuCalendrier(token, annee)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setErr(e instanceof Error ? e.message : "Erreur"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [token, annee]);

  const hex = (cle: string | null): string => (cle ? couleurs.find((c) => c.cle === cle)?.hex ?? "#8a5a12" : "#8a5a12");
  const occ = (data?.occurrences ?? []).filter((o) => filtre === "tout" || o.origine === filtre);
  const fmt = (iso: string): string => new Date(iso + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "long" });

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label className="field" style={{ maxWidth: 160 }}><span>Année</span>
          <input type="number" min={1900} max={2200} value={annee} onChange={(e) => setAnnee(Number(e.target.value) || ANNEE_COURANTE)} />
        </label>
        <div role="tablist" aria-label="Filtrer" style={{ display: "flex", gap: 6, marginTop: 18 }}>
          {(["tout", "institution", "liturgie"] as const).map((f) => (
            <button key={f} type="button" className={`btn btn-inline ${filtre === f ? "btn-primary" : "btn-ghost"}`} onClick={() => setFiltre(f)}>
              {f === "tout" ? "Tout" : f === "institution" ? "Institution" : "Liturgie"}
            </button>
          ))}
        </div>
        {data && <span className="muted small" style={{ marginTop: 18 }}>{data.resume.total} dates · {data.resume.institution} institution · {data.resume.liturgie} liturgie</span>}
        <button type="button" className="btn btn-ghost btn-inline" style={{ marginTop: 18 }} onClick={() => void telechargerApercuICS(token, annee).catch((e) => setErr(e instanceof Error ? e.message : "Erreur"))}>
          Exporter (.ics)
        </button>
      </div>

      {err && <div className="banner-error" style={{ marginTop: 10 }}>{err}</div>}

      {data && data.alertes.length > 0 && (
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          {data.alertes.map((a, i) => (
            <div key={i} className={a.niveau === "avertissement" ? "banner-error" : "banner-info"} style={{ margin: 0 }}>{a.message}</div>
          ))}
        </div>
      )}

      {loading ? (
        <p className="muted" style={{ marginTop: 14 }}>Calcul de l'aperçu…</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {occ.map((o, i) => (
            <li key={`${o.origine}-${o.source_id}-${i}`} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", border: "1px solid var(--adsum-line, #e2e6ee)", borderLeft: `4px solid ${hex(o.couleur)}`, borderRadius: 10, background: "var(--adsum-panel, #fff)" }}>
              <span style={{ minWidth: 132, fontVariantNumeric: "tabular-nums", color: "var(--adsum-mut, #667)" }}>{fmt(o.date)}</span>
              <span style={{ flex: 1 }}>
                <strong>{o.titre}</strong>
                {o.anciennete != null ? <span className="muted small"> · {o.anciennete}e anniversaire</span> : null}
                <div className="muted small" style={{ marginTop: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: hex(o.couleur) }}>{o.badge}</span>
                  {o.origine === "liturgie" ? " · Calendrier catholique" : " · Institution"}
                  {o.rang ? ` · ${o.rang}` : ""}
                </div>
              </span>
            </li>
          ))}
          {occ.length === 0 && <li className="muted">Aucune date pour ce filtre.</li>}
        </ul>
      )}
    </div>
  );
}
