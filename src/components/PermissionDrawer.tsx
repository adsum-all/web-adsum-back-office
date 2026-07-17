import { useEffect } from "react";

import type { PermissionItem } from "../api.js";

/**
 * Right-side sliding documentation panel for a single permission. It reuses the
 * shared drawer chrome (.drawer-root / .drawer-overlay / .drawer-panel) so it slides
 * in from the right exactly like the directory panel. It turns the raw catalogue
 * entry into a readable explanation: what the permission grants, on which scope, how
 * sensitive it is, and what it explicitly does NOT allow, so an administrator grants
 * access knowingly. Read-only: it never mutates anything.
 */

const RISQUE: Record<string, { couleur: string; label: string; explication: string }> = {
  faible: {
    couleur: "#2f9e44",
    label: "Faible",
    explication: "Consultation ou action à impact réduit. Peu de conséquences en cas d'erreur.",
  },
  moyen: {
    couleur: "#f08c00",
    label: "Moyen",
    explication: "Gestion courante. L'impact reste circonscrit au périmètre concerné.",
  },
  eleve: {
    couleur: "#e8590c",
    label: "Élevé",
    explication: "Action sensible pouvant toucher de nombreux membres ou données. À accorder avec discernement.",
  },
  critique: {
    couleur: "#c92a2a",
    label: "Critique",
    explication: "Pouvoir système. Accordable uniquement par la super-administration.",
  },
};

const PORTEE: Record<string, { label: string; explication: string }> = {
  global: {
    label: "Toute la base",
    explication: "S'applique à l'ensemble de la communauté, sans restriction d'unité.",
  },
  scope: {
    label: "Périmètre restreint",
    explication:
      "Limité à l'unité où le membre est placé (coordination, intendance, commission ou tribu). Aucune donnée n'est visible en dehors de ce périmètre.",
  },
};

export function PermissionDrawer({
  permission,
  onClose,
}: {
  permission: PermissionItem | null;
  onClose: () => void;
}): JSX.Element | null {
  useEffect(() => {
    if (!permission) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [permission, onClose]);

  if (!permission) return null;

  const risque = RISQUE[permission.risque] ?? {
    couleur: "#868e96",
    label: permission.risque,
    explication: "Niveau de sensibilité de cette permission.",
  };
  const portee = PORTEE[permission.portee] ?? {
    label: permission.portee,
    explication: "Étendue sur laquelle cette permission s'applique.",
  };

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-label={`Détail de la permission ${permission.libelle}`}>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer-panel">
        <header className="drawer-head">
          <div>
            <p className="nav-group-title" style={{ margin: 0 }}>{permission.domaine}</p>
            <h2 className="drawer-title">{permission.libelle}</h2>
            <span className="mono muted small">{permission.cle}</span>
          </div>
          <button type="button" className="drawer-close" aria-label="Fermer le détail" onClick={onClose}>
            &times;
          </button>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge" style={{ background: risque.couleur, color: "#fff" }}>Risque : {risque.label}</span>
            <span className="badge badge-mut">{portee.label}</span>
          </div>

          <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h3 className="section-title" style={{ fontSize: 15, margin: 0 }}>Ce que cette permission autorise</h3>
            <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>
              {permission.description || "Cette permission autorise l'action décrite par son libellé."}
            </p>
          </section>

          {permission.limite && (
            <section
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                background: "rgba(201, 42, 42, 0.06)",
                border: "1px solid rgba(201, 42, 42, 0.28)",
                borderRadius: 10,
                padding: "10px 12px",
              }}
            >
              <h3 className="section-title" style={{ fontSize: 14, margin: 0, color: "#c0392b" }}>Ne permet pas</h3>
              <p style={{ margin: 0, lineHeight: 1.5, color: "#c0392b" }}>{permission.limite}</p>
            </section>
          )}

          <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h3 className="section-title" style={{ fontSize: 15, margin: 0 }}>Portée : {portee.label}</h3>
            <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>{portee.explication}</p>
          </section>

          <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <h3 className="section-title" style={{ fontSize: 15, margin: 0 }}>Niveau de sensibilité : {risque.label}</h3>
            <p className="muted" style={{ margin: 0, lineHeight: 1.5 }}>{risque.explication}</p>
          </section>
        </div>
      </aside>
    </div>
  );
}
