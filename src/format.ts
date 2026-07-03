// Small display helpers shared across the back office. No business logic here,
// only presentation of values that come from the API.

export function fullName(prenoms: string | null, nom: string | null, fallback: string): string {
  const value = `${prenoms ?? ""} ${nom ?? ""}`.trim();
  return value.length > 0 ? value : fallback;
}

/** Rendered name with the confirmed honorific prefix (Berger, Coordinatrice...)
 *  before it, exactly as the member app renders it. The API only fills `titre`
 *  once an administrator confirmed the function, so no unearned title shows. */
export function displayName(titre: string | null | undefined, prenoms: string | null, nom: string | null, fallback: string): string {
  const base = fullName(prenoms, nom, fallback);
  return titre ? `${titre} ${base}` : base;
}

export function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return `${(parts[0] ?? "").charAt(0)}${(parts[1] ?? "").charAt(0)}`.toUpperCase();
}

export function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
