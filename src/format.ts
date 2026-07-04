// Small display helpers shared across the back office. No business logic here,
// only presentation of values that come from the API.

export function fullName(prenoms: string | null, nom: string | null, fallback: string): string {
  const value = `${prenoms ?? ""} ${nom ?? ""}`.trim();
  return value.length > 0 ? value : fallback;
}

const PARTICULES = new Set(["de", "du", "des", "la", "le", "les", "da", "di", "del", "della", "dos", "das", "van", "von", "d"]);

function capWord(word: string): string {
  return word
    .split(/([-'’])/)
    .map((seg) => {
      const f = seg[0];
      return f && /[a-zà-ÿ]/i.test(f) ? f.toUpperCase() + seg.slice(1).toLowerCase() : seg;
    })
    .join("");
}

/** Civil display name: first two given names (title case) + NOM (uppercase),
 * never a function. Prefers the server value (nom_affichage) when present. */
export function civilName(m: { nom_affichage?: string | null; nom?: string | null; prenoms?: string | null }, fallback = ""): string {
  const server = (m.nom_affichage ?? "").trim();
  if (server) return server;
  const fam = (m.nom ?? "").trim().replace(/\s+/g, " ").toUpperCase();
  const prenoms = (m.prenoms ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((mot, i) => (i > 0 && PARTICULES.has(mot.toLowerCase()) ? mot.toLowerCase() : capWord(mot)))
    .slice(0, 2);
  const value = [...prenoms, fam].filter(Boolean).join(" ");
  return value || fallback;
}

/** Function label with its scope, for the dedicated function zone. */
export function fonctionLabel(titre?: string | null, perimetre?: string | null): string | null {
  const t = (titre ?? "").trim();
  if (!t) return null;
  const p = (perimetre ?? "").trim();
  return p ? `${t} - ${p}` : t;
}

/** Deprecated: kept for callers passing (titre, prenoms, nom, fallback); the
 * title is now ignored so a function can never pollute the name. */
export function displayName(_titre: string | null | undefined, prenoms: string | null, nom: string | null, fallback: string): string {
  return civilName({ nom, prenoms }, fallback);
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
