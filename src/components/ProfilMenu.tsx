import { useEffect, useRef, useState } from "react";

import { type Me, getMe, getMembre, getMesPreferences, setMesPreferences } from "../api.js";
import { civilName, initials } from "../format.js";
import { roleLabel } from "./utilisateursShared.js";

/**
 * Profile entry point in the top bar: the avatar becomes a button that opens a small
 * menu identifying the SIGNED-IN back-office account (name, e-mail, role) and offering
 * sign-out. It represents the operator using the back office, never a directory member,
 * and shows no sensitive technical detail. Identity is read from the authenticated
 * /auth/me endpoint (and the member profile for the display name); nothing is hardcoded.
 */
export function ProfilMenu({ token, onLogout, onOpenProfil }: Readonly<{ token: string; onLogout: () => void; onOpenProfil?: () => void }>): JSX.Element {
  const [me, setMe] = useState<Me | null>(null);
  const [nom, setNom] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [vuePref, setVuePref] = useState<"calendrier" | "liste">("calendrier");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    getMesPreferences(token)
      .then((p) => { if (alive && (p.vue_evenements === "liste" || p.vue_evenements === "calendrier")) setVuePref(p.vue_evenements); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [token]);

  function choisirVuePref(v: "calendrier" | "liste"): void {
    setVuePref(v);
    try {
      if (typeof localStorage !== "undefined") localStorage.setItem("adsum.bo.evenements.vue", v);
    } catch {
      /* private mode: server preference still applies on next load. */
    }
    void setMesPreferences(token, { vue_evenements: v }).catch(() => undefined);
  }

  useEffect(() => {
    let alive = true;
    getMe(token)
      .then((m) => {
        if (!alive) return;
        setMe(m);
        if (m.membre_id) {
          getMembre(token, m.membre_id)
            .then((mb) => { if (alive) setNom(civilName(mb, mb.matricule)); })
            .catch(() => undefined);
        }
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [token]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const role = me?.role ?? "";
  const label = nom ?? me?.email ?? "";
  const avatar = label ? initials(label) : role.slice(0, 2).toUpperCase();

  return (
    <div className="profil-menu" ref={ref}>
      <button
        type="button"
        className="topbar-avatar"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Mon profil"
        onClick={() => setOpen((o) => !o)}
        style={{ cursor: "pointer", border: "none" }}
      >
        {avatar}
      </button>
      {open && (
        <div className="profil-menu-panel" role="menu">
          <div className="profil-menu-head">
            <div className="topbar-avatar profil-menu-avatar" aria-hidden="true">{avatar}</div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: "block", overflowWrap: "anywhere" }}>{nom ?? "Mon compte"}</strong>
              {me?.email && <span className="muted small" style={{ display: "block", overflowWrap: "anywhere" }}>{me.email}</span>}
              <span className="badge badge-ok" style={{ marginTop: 4, display: "inline-block" }}>{roleLabel(role)}</span>
            </div>
          </div>
          <div style={{ padding: "10px 12px 0" }}>
            <p className="muted small" style={{ margin: "0 0 6px" }}>
              Affichage des événements (préférence propre à ce compte, sur tous vos appareils) :
            </p>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className={`btn btn-inline ${vuePref === "calendrier" ? "btn-primary" : "btn-ghost"}`}
                aria-pressed={vuePref === "calendrier"}
                onClick={() => choisirVuePref("calendrier")}
              >
                Calendrier
              </button>
              <button
                type="button"
                className={`btn btn-inline ${vuePref === "liste" ? "btn-primary" : "btn-ghost"}`}
                aria-pressed={vuePref === "liste"}
                onClick={() => choisirVuePref("liste")}
              >
                Liste
              </button>
            </div>
          </div>
          <div className="profil-menu-actions">
            {onOpenProfil && (
              <button type="button" className="btn btn-ghost btn-inline" role="menuitem" onClick={() => { setOpen(false); onOpenProfil(); }}>
                Voir mon profil complet
              </button>
            )}
            <button type="button" className="btn btn-ghost btn-inline" role="menuitem" onClick={() => { setOpen(false); onLogout(); }}>
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
