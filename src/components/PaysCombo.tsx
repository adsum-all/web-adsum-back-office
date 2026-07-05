import { type CSSProperties, useState } from "react";

import { PAYS, filtrerPays } from "../countries.js";

const comboOptStyle: CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "6px 10px",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  borderRadius: 6,
};

/**
 * Searchable country selector. Type the first letters to filter the long list
 * (accent-insensitive); the selected country name shows when the field is not
 * focused. Value is the ISO 3166-1 alpha-2 code; "Aucun" clears the selection.
 * Reused by the organisation forms and the member form so every country field
 * behaves the same.
 */
export function PaysCombo({
  value,
  onChange,
  placeholder = "Pays (tapez pour filtrer)",
}: {
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
}): JSX.Element {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const selected = PAYS.find((p) => p.code === value);
  const results = (q.trim() ? filtrerPays(q) : PAYS).slice(0, 80);
  return (
    <div style={{ position: "relative", minWidth: 190 }}>
      <input
        className="search"
        value={open ? q : selected?.nom ?? ""}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQ("");
        }}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        aria-label="Pays"
      />
      {open && (
        <ul
          style={{
            position: "absolute",
            zIndex: 30,
            top: "calc(100% + 2px)",
            left: 0,
            width: "100%",
            maxHeight: 240,
            overflowY: "auto",
            margin: 0,
            padding: 4,
            listStyle: "none",
            background: "var(--adsum-surface, #fff)",
            border: "1px solid var(--adsum-border, #d0d0d8)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <li>
            <button
              type="button"
              style={comboOptStyle}
              onMouseDown={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Aucun
            </button>
          </li>
          {results.map((p) => (
            <li key={p.code}>
              <button
                type="button"
                style={comboOptStyle}
                onMouseDown={() => {
                  onChange(p.code);
                  setOpen(false);
                }}
              >
                {p.nom} <span style={{ opacity: 0.5 }}>{p.indicatif}</span>
              </button>
            </li>
          ))}
          {results.length === 0 && <li style={{ padding: "6px 10px", opacity: 0.6 }}>Aucun pays trouvé</li>}
        </ul>
      )}
    </div>
  );
}
