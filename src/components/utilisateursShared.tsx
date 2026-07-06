// Shared labels, helpers and the risk badge for the access-and-groups screens.
// Extracted so each screen file stays well under the size threshold.

export interface CibleMembre {
  id: string;
  nom: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super-administration",
  admin: "Administration",
  gestionnaire: "Gestion des membres",
  controleur: "Contrôle",
  direction: "Direction",
  membre: "Membre (aucun accès plateforme)",
};

// Roles that only make sense globally: their groups cannot be scoped to a unit.
export const GLOBAL_ONLY_ROLES = new Set(["super_admin", "admin"]);

const PORTEE_LABELS: Record<string, string> = {
  global: "Global (toute la base)",
  coordination: "Coordination",
  intendance: "Intendance",
  commission: "Commission / mission",
  tribu: "Tribu",
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function porteeLabel(type: string, libelle: string | null): string {
  if (type === "global") return "Global";
  return `${PORTEE_LABELS[type] ?? type}${libelle ? ` : ${libelle}` : ""}`;
}

const RISQUE_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  faible: { bg: "#e6f6ee", fg: "#1f9d6b", label: "risque faible" },
  moyen: { bg: "#fff5e6", fg: "#b8791b", label: "risque moyen" },
  eleve: { bg: "#fdeef0", fg: "#c0394a", label: "risque élevé" },
  critique: { bg: "#fbe9ea", fg: "#a01925", label: "risque critique" },
};

const RISQUE_FALLBACK = { bg: "#fff5e6", fg: "#b8791b", label: "risque moyen" };

export function RisqueBadge({ risque }: { risque: string }): JSX.Element {
  const s = RISQUE_STYLE[risque] ?? RISQUE_FALLBACK;
  return (
    <span style={{ background: s.bg, color: s.fg, borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 600 }}>
      {s.label}
    </span>
  );
}
