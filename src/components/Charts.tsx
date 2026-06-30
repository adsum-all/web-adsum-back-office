// Lightweight, dependency-free SVG charts for the ADSUM back-office.
// Colours follow the design system (@adsum/tokens) brand palette. Every chart is
// rendered from real data passed by the caller; there is no synthetic series here.

export const CHART_PALETTE = [
  "#2a4fad",
  "#5b82d8",
  "#8aa8e6",
  "#1f8a5b",
  "#b6791b",
  "#c0392b",
  "#676b73",
  "#223f8a",
];

export interface ChartDatum {
  label: string;
  value: number;
}

interface DonutProps {
  segments: ChartDatum[];
  /** Text shown in the centre of the ring (defaults to the total). */
  centerLabel?: string;
  size?: number;
}

/**
 * Donut chart with a centred total and an inline legend.
 */
export function DonutChart({ segments, centerLabel, size = 168 }: DonutProps): JSX.Element {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  const radius = size / 2;
  const stroke = size * 0.16;
  const inner = radius - stroke / 2;
  const circumference = 2 * Math.PI * inner;
  let offset = 0;

  if (total === 0) {
    return <p className="muted">Aucune donnee.</p>;
  }

  return (
    <div className="donut-wrap">
      <svg
        className="chart-svg donut"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Repartition: ${segments.map((s) => `${s.label} ${s.value}`).join(", ")}`}
      >
        <g transform={`rotate(-90 ${radius} ${radius})`}>
          {segments.map((s, i) => {
            const fraction = s.value / total;
            const dash = fraction * circumference;
            const seg = (
              <circle
                key={s.label}
                cx={radius}
                cy={radius}
                r={inner}
                fill="none"
                stroke={CHART_PALETTE[i % CHART_PALETTE.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += dash;
            return seg;
          })}
        </g>
        <text x={radius} y={radius - 4} textAnchor="middle" className="donut-total">
          {total.toLocaleString("fr-FR")}
        </text>
        <text x={radius} y={radius + 16} textAnchor="middle" className="donut-sub">
          {centerLabel ?? "total"}
        </text>
      </svg>
      <ul className="legend-list">
        {segments.map((s, i) => (
          <li key={s.label}>
            <i style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }} />
            <span>{s.label}</span>
            <b>{s.value.toLocaleString("fr-FR")}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface BarProps {
  items: ChartDatum[];
  height?: number;
}

/**
 * Vertical bar chart with value labels and a faint baseline grid.
 */
export function BarChart({ items, height = 220 }: BarProps): JSX.Element {
  if (items.length === 0) {
    return <p className="muted">Aucune donnee.</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.value));
  const width = Math.max(items.length * 64, 320);
  const padBottom = 34;
  const padTop = 16;
  const plot = height - padBottom - padTop;
  const slot = width / items.length;
  const barW = Math.min(40, slot * 0.5);

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Histogramme: ${items.map((i) => `${i.label} ${i.value}`).join(", ")}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {[0, 0.25, 0.5, 0.75, 1].map((g) => {
        const y = padTop + plot * (1 - g);
        return (
          <line key={g} x1={0} x2={width} y1={y} y2={y} className="grid-line" />
        );
      })}
      {items.map((it, i) => {
        const h = (it.value / max) * plot;
        const x = slot * i + (slot - barW) / 2;
        const y = padTop + plot - h;
        return (
          <g key={it.label}>
            <rect x={x} y={y} width={barW} height={h} rx={4} fill="url(#barGrad)" />
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" className="bar-num">
              {it.value}
            </text>
            <text x={x + barW / 2} y={height - 12} textAnchor="middle" className="bar-cat">
              {it.label.length > 10 ? `${it.label.slice(0, 9)}.` : it.label}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3563c9" />
          <stop offset="100%" stopColor="#2a4fad" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface LineProps {
  points: ChartDatum[];
  height?: number;
}

/**
 * Area line chart for a time series (e.g. monthly entries).
 */
export function LineChart({ points, height = 220 }: LineProps): JSX.Element {
  if (points.length === 0) {
    return <p className="muted">Aucune donnee.</p>;
  }
  const max = Math.max(1, ...points.map((p) => p.value));
  const width = Math.max(points.length * 56, 360);
  const padX = 28;
  const padTop = 16;
  const padBottom = 30;
  const plot = height - padTop - padBottom;
  const stepX = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: padX + stepX * i,
    y: padTop + plot * (1 - p.value / max),
    ...p,
  }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1]?.x ?? padX} ${padTop + plot} L ${
    coords[0]?.x ?? padX
  } ${padTop + plot} Z`;

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Courbe: ${points.map((p) => `${p.label} ${p.value}`).join(", ")}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {[0, 0.5, 1].map((g) => {
        const y = padTop + plot * (1 - g);
        return <line key={g} x1={padX} x2={width - padX} y1={y} y2={y} className="grid-line" />;
      })}
      <path d={areaPath} fill="url(#lineGrad)" opacity={0.18} />
      <path d={linePath} fill="none" stroke="#2a4fad" strokeWidth={2.5} strokeLinejoin="round" />
      {coords.map((c) => (
        <g key={c.label}>
          <circle cx={c.x} cy={c.y} r={3.5} fill="#fff" stroke="#2a4fad" strokeWidth={2} />
          <text x={c.x} y={height - 10} textAnchor="middle" className="bar-cat">
            {c.label}
          </text>
        </g>
      ))}
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a4fad" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
    </svg>
  );
}
