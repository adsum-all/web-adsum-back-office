import { useMemo, useRef, useState } from "react";

/**
 * Searchable IANA timezone picker. Never a free-text field: the reference timezone
 * must be a real IANA identifier. Each option shows the current local time and the
 * live UTC offset (recomputed from Intl, so it follows daylight-saving rules). The
 * stored value is the IANA id (e.g. "Africa/Abidjan"), not the display string.
 */
const FALLBACK_ZONES = [
  "Africa/Abidjan", "Africa/Lagos", "Africa/Kinshasa", "Africa/Nairobi", "Africa/Casablanca",
  "Europe/Paris", "Europe/London", "Europe/Brussels", "Europe/Rome", "Europe/Madrid",
  "America/New_York", "America/Chicago", "America/Los_Angeles", "America/Toronto", "America/Sao_Paulo",
  "Asia/Dubai", "Asia/Beirut", "Asia/Jerusalem", "Asia/Kolkata", "Asia/Tokyo", "Australia/Sydney",
];

function zonesDisponibles(): string[] {
  try {
    const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
    if (typeof sv === "function") {
      const list = sv("timeZone");
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch {
    /* older engine: fall back to the curated list */
  }
  return FALLBACK_ZONES;
}

export function offsetFuseau(tz: string): { heure: string; utc: string } {
  try {
    const now = new Date();
    const heure = new Intl.DateTimeFormat("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(now);
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" }).formatToParts(now);
    const raw = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+00:00";
    const utc = raw.replace("GMT", "UTC").replace(/^UTC$/, "UTC+00:00");
    return { heure, utc };
  } catch {
    return { heure: "--:--", utc: "UTC+00:00" };
  }
}

export function FuseauSelect({
  value,
  onChange,
  disabled,
}: Readonly<{ value: string; onChange: (tz: string) => void; disabled?: boolean }>): JSX.Element {
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const zones = useMemo(zonesDisponibles, []);
  const blurTimer = useRef<number | null>(null);

  const resultats = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const base = ql ? zones.filter((z) => z.toLowerCase().includes(ql)) : zones;
    return base.slice(0, 60);
  }, [q, zones]);

  const actuel = value ? offsetFuseau(value) : null;

  return (
    <div className="fuseau" style={{ position: "relative" }}>
      <input
        type="search"
        value={ouvert ? q : (value || "")}
        disabled={disabled}
        placeholder="Rechercher un fuseau (ville, pays, UTC)…"
        aria-label="Fuseau de référence"
        onFocus={() => { setOuvert(true); setQ(""); }}
        onBlur={() => { blurTimer.current = window.setTimeout(() => setOuvert(false), 150); }}
        onChange={(e) => setQ(e.target.value)}
      />
      {actuel && !ouvert ? (
        <span className="muted small" style={{ display: "block", marginTop: 4 }}>
          {actuel.heure} · {actuel.utc}
        </span>
      ) : null}
      {ouvert && resultats.length > 0 ? (
        <ul
          role="listbox"
          style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30, listStyle: "none", margin: "2px 0 0", padding: 4, maxHeight: 280, overflowY: "auto", background: "var(--adsum-panel, #fff)", border: "1px solid var(--adsum-line, #d7dbe3)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.14)" }}
        >
          {resultats.map((z) => {
            const o = offsetFuseau(z);
            return (
              <li key={z}>
                <button
                  type="button"
                  className="fuseau-option"
                  style={{ display: "flex", justifyContent: "space-between", gap: 10, width: "100%", textAlign: "left", border: "none", background: z === value ? "var(--adsum-line,#eef)" : "transparent", color: "inherit", padding: "8px 10px", borderRadius: 8, cursor: "pointer", font: "inherit" }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (blurTimer.current) window.clearTimeout(blurTimer.current);
                    onChange(z);
                    setOuvert(false);
                  }}
                >
                  <span>{z}</span>
                  <span className="muted small" style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{o.heure} · {o.utc}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="muted small" style={{ marginTop: 4 }}>
        Le décalage UTC peut évoluer selon les règles saisonnières du pays.
      </p>
    </div>
  );
}
