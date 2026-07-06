import { useCallback, useEffect, useMemo, useState } from "react";

import { type Session, getMyPermissions, logoutSession } from "./api.js";
import { Commissions } from "./components/Commissions.js";
import { ComptageVoletB } from "./components/ComptageVoletB.js";
import { Consentements } from "./components/Consentements.js";
import { ComptesMasse } from "./components/ComptesMasse.js";
import { Dashboard } from "./components/Dashboard.js";
import { DemandesAdmin } from "./components/DemandesAdmin.js";
import { Doublons } from "./components/Doublons.js";
import { Fonctions } from "./components/Fonctions.js";
import { Niveaux } from "./components/Niveaux.js";
import { Inscriptions } from "./components/Inscriptions.js";
import { Evenements } from "./components/Evenements.js";
import { JournalAudit } from "./components/JournalAudit.js";
import { Login } from "./components/Login.js";
import { Anniversaires } from "./components/Anniversaires.js";
import { Attestations } from "./components/Attestations.js";
import { Integrations } from "./components/Integrations.js";
import { Membres } from "./components/Membres.js";
import { ParticipationStats } from "./components/ParticipationStats.js";
import { Organisation } from "./components/Organisation.js";
import { Statistiques } from "./components/Statistiques.js";
import { Terminaux } from "./components/Terminaux.js";
import { Utilisateurs } from "./components/Utilisateurs.js";
import { MatricePermissions } from "./components/MatricePermissions.js";

type Section =
  | "dashboard"
  | "statistiques"
  | "participation"
  | "inscriptions"
  | "demandes"
  | "membres"
  | "doublons"
  | "commissions"
  | "fonctions"
  | "niveaux"
  | "organisation"
  | "evenements"
  | "anniversaires"
  | "comptage"
  | "utilisateurs"
  | "permissions"
  | "comptes-masse"
  | "terminaux"
  | "integrations"
  | "consentements"
  | "attestations"
  | "audit";

// Each section is shown only to an account that holds its permission. The key is
// the read/consult permission the section's primary endpoint requires, so the
// menu mirrors what the server would allow. The menu is never the barrier: every
// endpoint stays guarded server side by require_permission.
const NAV: { id: Section; label: string; group: string; perm: string }[] = [
  { id: "dashboard", label: "Tableau de bord", group: "PILOTAGE", perm: "statistiques.consulter" },
  { id: "statistiques", label: "Statistiques", group: "PILOTAGE", perm: "statistiques.consulter" },
  { id: "participation", label: "Participation & assiduité", group: "PILOTAGE", perm: "participation.consulter" },
  { id: "inscriptions", label: "Inscriptions à valider", group: "MEMBRES", perm: "inscriptions.gerer" },
  { id: "demandes", label: "Demandes des membres", group: "MEMBRES", perm: "demandes.superviser" },
  { id: "membres", label: "Annuaire des membres", group: "MEMBRES", perm: "membres.consulter" },
  { id: "doublons", label: "Détection de doublons", group: "MEMBRES", perm: "doublons.consulter" },
  { id: "commissions", label: "Commissions & missions", group: "ORGANISATION", perm: "commissions.consulter" },
  { id: "fonctions", label: "Fonctions & titres", group: "ORGANISATION", perm: "fonctions.consulter" },
  { id: "niveaux", label: "Niveaux d'engagement", group: "ORGANISATION", perm: "niveaux-engagement.consulter" },
  { id: "organisation", label: "Coordinations & intendances", group: "ORGANISATION", perm: "organisation.consulter" },
  { id: "evenements", label: "Calendrier des événements", group: "ÉVÉNEMENTS", perm: "evenements.consulter" },
  { id: "anniversaires", label: "Souhaits d'anniversaire", group: "ÉVÉNEMENTS", perm: "anniversaires.gerer" },
  { id: "comptage", label: "Comptage volet B", group: "ÉVÉNEMENTS", perm: "comptage.superviser" },
  { id: "utilisateurs", label: "Accès & groupes", group: "SYSTÈME", perm: "acces.administrer" },
  { id: "permissions", label: "Matrice des permissions", group: "SYSTÈME", perm: "acces.administrer" },
  { id: "comptes-masse", label: "Créer comptes (masse)", group: "SYSTÈME", perm: "comptes.systeme" },
  { id: "terminaux", label: "Terminaux de scan", group: "SYSTÈME", perm: "terminaux.consulter" },
  { id: "integrations", label: "Intégrations & aide", group: "SYSTÈME", perm: "integrations.superviser" },
  { id: "consentements", label: "Documents & consentements", group: "SYSTÈME", perm: "consentements.consulter" },
  { id: "attestations", label: "Attestations & pays", group: "SYSTÈME", perm: "attestations.gerer" },
  { id: "audit", label: "Journal d'audit", group: "SYSTÈME", perm: "audit.administrer" },
];

// Persisted admin session: a refresh no longer signs the administrator out.
const SESSION_KEY = "adsum.bo.session";
function loadSession(): Session | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SESSION_KEY) : null;
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
function saveSession(s: Session | null): void {
  try {
    if (typeof localStorage === "undefined") return;
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* private mode: session stays in memory only. */
  }
}

export function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [section, setSection] = useState<Section>("dashboard");

  const onAuth = useCallback((s: Session) => {
    saveSession(s);
    setSession(s);
  }, []);
  const deconnexion = useCallback(() => {
    if (session?.token) void logoutSession(session.token).catch(() => undefined);
    saveSession(null);
    setSession(null);
  }, [session]);

  // Re-hydrate a session persisted before permissions were stored, so a refresh
  // keeps the exact same visible menu without forcing the user to sign in again.
  useEffect(() => {
    if (!session || session.permissions !== undefined) return;
    let cancelled = false;
    void getMyPermissions(session.token)
      .then((p) => {
        if (cancelled) return;
        const hydrated: Session = { ...session, permissions: p.permissions };
        saveSession(hydrated);
        setSession(hydrated);
      })
      .catch(() => {
        // Token no longer valid: sign out rather than show a stale menu.
        if (!cancelled) {
          saveSession(null);
          setSession(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const held = useMemo(() => new Set(session?.permissions ?? []), [session]);
  const visibleNav = useMemo(() => NAV.filter((n) => held.has(n.perm)), [held]);

  if (!session) {
    return <Login onAuth={onAuth} />;
  }
  if (session.permissions === undefined) {
    return <div className="auth"><p className="muted">Chargement de la session...</p></div>;
  }

  const groups = Array.from(new Set(visibleNav.map((n) => n.group)));
  // Deny-by-default: only ever land on a section the account may see.
  const current = visibleNav.find((n) => n.id === section) ?? visibleNav[0];
  const activeId = current?.id;
  const initials = session.role.slice(0, 2).toUpperCase();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">
            A
          </span>
          <span className="brand-text">
            ADSUM
            <span className="brand-sub">Back-office</span>
          </span>
        </div>
        <nav>
          {groups.map((group) => (
            <div key={group} className="nav-group">
              <p className="nav-group-title">{group}</p>
              {visibleNav
                .filter((n) => n.group === group)
                .map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`nav-item ${activeId === n.id ? "nav-item-active" : ""}`}
                    onClick={() => setSection(n.id)}
                  >
                    {n.label}
                  </button>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="muted small">{session.role}</span>
          <button type="button" className="link" onClick={deconnexion}>
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="topbar-app">
          <div className="topbar-title">
            <p className="topbar-crumb">{current?.group}</p>
            <h1 className="topbar-h1">{current?.label}</h1>
          </div>
          <label className="search-global">
            <span className="search-ico" aria-hidden="true">
              ⌕
            </span>
            <input
              type="search"
              placeholder="Rechercher un membre, un événement..."
              aria-label="Recherche globale"
            />
          </label>
          <span className="event-chip" title="Événement actif">
            <span className="event-dot" aria-hidden="true" />
            Aucun événement actif
          </span>
          <span className="topbar-avatar" title={session.role}>
            {initials}
          </span>
        </header>
        <div className="main-scroll">
          {activeId === "dashboard" && <Dashboard token={session.token} />}
          {activeId === "statistiques" && <Statistiques token={session.token} />}
          {activeId === "participation" && <ParticipationStats token={session.token} />}
          {activeId === "inscriptions" && <Inscriptions token={session.token} />}
          {activeId === "demandes" && <DemandesAdmin token={session.token} />}
          {activeId === "membres" && <Membres token={session.token} />}
          {activeId === "doublons" && <Doublons token={session.token} />}
          {activeId === "commissions" && <Commissions token={session.token} />}
          {activeId === "fonctions" && <Fonctions token={session.token} />}
          {activeId === "niveaux" && <Niveaux token={session.token} />}
          {activeId === "organisation" && <Organisation token={session.token} />}
          {activeId === "evenements" && <Evenements token={session.token} />}
          {activeId === "anniversaires" && <Anniversaires token={session.token} />}
          {activeId === "comptage" && <ComptageVoletB token={session.token} />}
          {activeId === "utilisateurs" && <Utilisateurs token={session.token} />}
          {activeId === "permissions" && <MatricePermissions token={session.token} />}
          {activeId === "comptes-masse" && <ComptesMasse token={session.token} />}
          {activeId === "terminaux" && <Terminaux token={session.token} />}
          {activeId === "integrations" && <Integrations token={session.token} />}
          {activeId === "consentements" && <Consentements token={session.token} />}
          {activeId === "attestations" && <Attestations token={session.token} />}
          {activeId === "audit" && <JournalAudit token={session.token} />}
          {!activeId && <p className="muted">Aucune rubrique accessible avec vos permissions.</p>}
        </div>
      </main>
    </div>
  );
}
