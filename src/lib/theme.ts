// Display theme for the back office. The shared design tokens react to a data-theme
// attribute on the document root (and to the OS preference in "system" mode), so the
// whole app switches light/dark by toggling that single attribute. The choice is kept
// in localStorage for an instant, flash-free apply on load, and mirrored server-side
// (utilisateur.preferences.theme) so it follows the account across devices.
export type Theme = "light" | "dark" | "system";

const KEY = "adsum.bo.theme";

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

export function loadTheme(): Theme {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : null;
    return v === "light" || v === "dark" || v === "system" ? v : "system";
  } catch {
    return "system";
  }
}

export function saveTheme(theme: Theme): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: the server preference still applies on next load. */
  }
}

export function initTheme(): void {
  applyTheme(loadTheme());
}
