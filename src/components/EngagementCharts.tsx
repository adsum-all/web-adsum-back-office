import { useMemo } from "react";

import type { EngagementDashboardData } from "../api.js";

const CANAL_LABEL: Record<string, string> = { qr: "QR code", manuel: "Saisie manuelle", import: "Import Excel" };
const CANAL_COLOR: Record<string, string> = { qr: "#2a4fad", manuel: "#1f8a5b", import: "#e8590c" };
const PALETTE = ["#2a4fad", "#1f8a5b", "#e8590c", "#8a5a12", "#7048e8", "#0b7285", "#c2255c", "#495057"];

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0;
}

/** Horizontal bar chart: one row per entry, bar width proportional to the max. */
function Bars({ data, colorFor }: { data: [string, number][]; colorFor: (k: string, i: number) => string }): JSX.Element {
  const max = Math.max(1, ...data.map(([, n]) => n));
  if (data.length === 0) return <p className="muted small">Aucune donnée.</p>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map(([label, n], i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="small" style={{ width: 130, flexShrink: 0, color: "var(--adsum-ink2)" }}>{label}</span>
          <div style={{ flex: 1, background: "var(--adsum-board)", borderRadius: 999, height: 16, overflow: "hidden", minWidth: 0 }}>
            <div style={{ width: `${(n / max) * 100}%`, height: "100%", background: colorFor(label, i), borderRadius: 999, transition: "width .3s" }} />
          </div>
          <span className="small mono" style={{ width: 34, textAlign: "right", flexShrink: 0 }}>{n}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Lightweight, dependency-free charts for the engagement dashboard: a conversion
 * split (pending vs converted) and channel/country distributions. Enough insight
 * without overloading the page or pulling a chart library.
 */
export function EngagementCharts({ data }: { data: EngagementDashboardData }): JSX.Element {
  const total = data.total;
  const canaux = useMemo(
    () => Object.entries(data.par_canal).sort((a, b) => b[1] - a[1]).map(([k, n]) => [CANAL_LABEL[k] ?? k, n] as [string, number]),
    [data.par_canal],
  );
  const pays = useMemo(
    () => Object.entries(data.par_pays).sort((a, b) => b[1] - a[1]).map(([k, n]) => [k, n] as [string, number]),
    [data.par_pays],
  );
  const convPct = pct(data.converti, total);
  const attPct = total > 0 ? 100 - convPct : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginTop: 16 }}>
      <div className="form-card">
        <h3 className="section-title">Conversion</h3>
        <div style={{ display: "flex", height: 20, borderRadius: 999, overflow: "hidden", background: "var(--adsum-board)" }}>
          <div title={`Convertis ${convPct}%`} style={{ width: `${convPct}%`, background: "#1f8a5b" }} />
          <div title={`En attente ${attPct}%`} style={{ width: `${attPct}%`, background: "#f08c00" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span className="small"><span style={{ color: "#1f8a5b", fontWeight: 700 }}>&#9632;</span> Convertis : {data.converti} ({convPct}%)</span>
          <span className="small"><span style={{ color: "#f08c00", fontWeight: 700 }}>&#9632;</span> En attente : {data.en_attente} ({attPct}%)</span>
        </div>
      </div>

      <div className="form-card">
        <h3 className="section-title">Répartition par canal</h3>
        <Bars data={canaux} colorFor={(label) => CANAL_COLOR[Object.keys(CANAL_LABEL).find((k) => CANAL_LABEL[k] === label) ?? ""] ?? "#2a4fad"} />
      </div>

      <div className="form-card">
        <h3 className="section-title">Répartition par pays</h3>
        <Bars data={pays} colorFor={(_, i) => PALETTE[i % PALETTE.length] ?? "#2a4fad"} />
      </div>
    </div>
  );
}
