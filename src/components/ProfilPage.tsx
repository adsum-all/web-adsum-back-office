import { useEffect, useState } from "react";

import { type Me, type MembreProfile, getMe, getMembre, getMesPreferences, setMesPreferences } from "../api.js";
import { civilName, initials } from "../format.js";
import { applyTheme, loadTheme, saveTheme, type Theme } from "../lib/theme.js";
import { roleLabel } from "./utilisateursShared.js";

/**
 * Full profile page for the SIGNED-IN back-office account: who is connected (name,
 * e-mail, role, matricule when linked to a directory member) plus the account's own
 * display preferences (event view and theme). Preferences are stored server-side on
 * the account (utilisateur.preferences) so they follow it across browsers and devices,
 * and mirrored in localStorage for an instant, flash-free apply. Nothing is hardcoded:
 * identity comes from /auth/me and the linked member profile.
 */
const THEMES: { id: Theme; label: string; hint: string }[] = [
  { id: "light", label: "Clair", hint: "Toujours en clair" },
  { id: "dark", label: "Sombre", hint: "Toujours en sombre" },
  { id: "system", label: "Système", hint: "Suivre l'appareil" },
];

export function ProfilPage({ token, onLogout }: Readonly<{ token: string; onLogout: () => void }>): JSX.Element {
  const [me, setMe] = useState<Me | null>(null);
  const [membre, setMembre] = useState<MembreProfile | null>(null);
  const [vue, setVue] = useState<"calendrier" | "liste">("calendrier");
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void getMe(token)
      .then((m) => {
        if (!alive) return;
        setMe(m);
        if (m.membre_id) {
          void getMembre(token, m.membre_id).then((mb) => { if (alive) setMembre(mb); }).catch(() => undefined);
        }
      })
      .catch(() => undefined);
    void getMesPreferences(token)
      .then((p) => {
        if (!alive) return;
        if (p.vue_evenements === "liste" || p.vue_evenements === "calendrier") setVue(p.vue_evenements);
        if (p.theme === "light" || p.theme === "dark" || p.theme === "system") {
          setTheme(p.theme);
          applyTheme(p.theme);
          saveTheme(p.theme);
        }
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [token]);

  function choisirVue(v: "calendrier" | "liste"): void {
    setVue(v);
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem("adsum.bo.evenements.vue", v);
    } catch { /* private mode: server preference still applies on next load. */ }
    setMsg("Préférence enregistrée.");
    void setMesPreferences(token, { vue_evenements: v }).catch(() => setMsg("Enregistrement impossible."));
  }

  function choisirTheme(t: Theme): void {
    setTheme(t);
    applyTheme(t);
    saveTheme(t);
    setMsg("Préférence enregistrée.");
    void setMesPreferences(token, { theme: t }).catch(() => setMsg("Enregistrement impossible."));
  }

  const role = me?.role ?? "";
  const nom = membre ? civilName(membre, membre.matricule) : me?.email ?? "Mon compte";
  const avatar = nom ? initials(nom) : role.slice(0, 2).toUpperCase();

  return (
    <div className="profil-page">
      <section className="card profil-page-ident">
        <div className="profil-page-avatar" aria-hidden="true">{avatar}</div>
        <div className="profil-page-ident-txt">
          <h2>{nom}</h2>
          {me?.email && <p className="muted">{me.email}</p>}
          <div className="profil-page-badges">
            <span className="badge badge-ok">{roleLabel(role)}</span>
            {membre?.matricule && <span className="badge">{membre.matricule}</span>}
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-inline profil-page-logout" onClick={onLogout}>
          Déconnexion
        </button>
      </section>

      <section className="card profil-page-prefs">
        <h3>Préférences d'affichage</h3>
        <p className="muted small">Ces réglages sont propres à votre compte et vous suivent sur tous vos appareils.</p>

        <div className="profil-page-pref">
          <div className="profil-page-pref-lib">
            <strong>Affichage des événements</strong>
            <span className="muted small">Vue par défaut du calendrier des événements.</span>
          </div>
          <div className="profil-page-choix">
            <button type="button" className={`btn btn-inline ${vue === "calendrier" ? "btn-primary" : "btn-ghost"}`}
              aria-pressed={vue === "calendrier"} onClick={() => choisirVue("calendrier")}>Calendrier</button>
            <button type="button" className={`btn btn-inline ${vue === "liste" ? "btn-primary" : "btn-ghost"}`}
              aria-pressed={vue === "liste"} onClick={() => choisirVue("liste")}>Liste</button>
          </div>
        </div>

        <div className="profil-page-pref">
          <div className="profil-page-pref-lib">
            <strong>Thème</strong>
            <span className="muted small">Apparence claire, sombre, ou selon votre appareil.</span>
          </div>
          <div className="profil-page-choix">
            {THEMES.map((t) => (
              <button key={t.id} type="button" title={t.hint}
                className={`btn btn-inline ${theme === t.id ? "btn-primary" : "btn-ghost"}`}
                aria-pressed={theme === t.id} onClick={() => choisirTheme(t.id)}>{t.label}</button>
            ))}
          </div>
        </div>

        {msg && <p className="profil-page-msg" role="status">{msg}</p>}
      </section>
    </div>
  );
}
