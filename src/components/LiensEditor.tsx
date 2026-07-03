import { detectPlatform } from "../platform.js";
import { InfoTip } from "./InfoTip.js";

const AIDE =
  "Vous pouvez ajouter plusieurs liens (Zoom, Telegram, YouTube...). La plateforme est " +
  "detectee automatiquement. Les liens ne sont visibles par les membres qu'a l'approche du " +
  "debut de la session.";

/** Repeatable list of broadcast links with automatic per-link platform detection.
 * Shared by the event creation form and the per-event session panel. */
export function LiensEditor({
  liens,
  onChange,
  disabled,
}: {
  liens: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}): JSX.Element {
  const rows = liens.length > 0 ? liens : [""];

  function setAt(index: number, value: string): void {
    onChange(rows.map((l, i) => (i === index ? value : l)));
  }

  function removeAt(index: number): void {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [""]);
  }

  function add(): void {
    onChange([...rows, ""]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span className="muted small" style={{ display: "inline-flex", alignItems: "center" }}>
        Liens de diffusion (Zoom, Telegram, YouTube...)
        <InfoTip title="Liens de diffusion" text={AIDE} />
      </span>
      {rows.map((lien, i) => {
        const trimmed = lien.trim();
        const platform = trimmed ? detectPlatform(trimmed) : null;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div className="toolbar">
              <input
                className="search"
                style={{ flex: 1 }}
                placeholder="https://..."
                value={lien}
                disabled={disabled}
                onChange={(e) => setAt(i, e.target.value)}
              />
              <button
                type="button"
                className="btn btn-ghost btn-inline"
                disabled={disabled || (rows.length === 1 && !trimmed)}
                onClick={() => removeAt(i)}
              >
                Retirer
              </button>
            </div>
            {platform && (
              <span
                style={{
                  alignSelf: "flex-start",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "2px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  background: platform.color,
                }}
              >
                {platform.label}
              </span>
            )}
          </div>
        );
      })}
      <div>
        <button type="button" className="btn btn-ghost btn-inline" disabled={disabled} onClick={add}>
          + Ajouter un lien
        </button>
      </div>
    </div>
  );
}
