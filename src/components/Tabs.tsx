import type { JSX } from "react";

export interface TabDef {
  id: string;
  label: string;
}

/** Accessible in-page tab bar: one page, several sections reachable without a
 * long scroll. Horizontally scrollable on narrow screens. */
export function Tabs({ tabs, active, onChange }: { tabs: TabDef[]; active: string; onChange: (id: string) => void }): JSX.Element {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={active === t.id}
          className={`tab-btn ${active === t.id ? "tab-btn-active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
