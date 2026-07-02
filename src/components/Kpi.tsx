// Shared KPI card used by the dashboard, the statistics screen and the
// participation screen, so every figure carries the same hierarchy: an
// uppercase label, a large display value and an optional muted hint.

export interface KpiProps {
  label: string;
  value: number | string | null | undefined;
  hint?: string;
  loading?: boolean;
  /** Brand-gradient variant for the leading figure of a grid. */
  accent?: boolean;
  /** Semantic colour applied to the value (positive, warning, negative, neutral). */
  tone?: "ok" | "warn" | "bad" | "mut";
}

export function Kpi({ label, value, hint, loading = false, accent = false, tone }: KpiProps): JSX.Element {
  const display =
    loading || value === null || value === undefined
      ? "..."
      : typeof value === "number"
        ? value.toLocaleString("fr-FR")
        : value;
  const classes = ["kpi"];
  if (accent) classes.push("kpi-accent");
  if (tone) classes.push(`kpi-${tone}`);
  return (
    <div className={classes.join(" ")}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{display}</span>
      {hint !== undefined && <span className="kpi-hint">{hint}</span>}
    </div>
  );
}
