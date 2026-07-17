import { useCallback, useEffect, useMemo, useState } from "react";

import { type Session, getMyPermissions, logoutSession } from "./api.js";
import { Commissions } from "./components/Commissions.js";
import { ComptageVoletB } from "./components/ComptageVoletB.js";
import { Consentements } from "./components/Consentements.js";
import { Dashboard } from "./components/Dashboard.js";
import { DemandesAdmin } from "./components/DemandesAdmin.js";
import { EngagementAdmin } from "./components/EngagementAdmin.js";
import { Doublons } from "./components/Doublons.js";
import { Fonctions } from "./components/Fonctions.js";
import { Niveaux } from "./components/Niveaux.js";
import { Inscriptions } from "./components/Inscriptions.js";
import { Evenements } from "./components/Evenements.js";
import { TypesEvenements } from "./components/TypesEvenements.js";
import { JournalAudit } from "./components/JournalAudit.js";
import { Login } from "./components/Login.js";
import { Anniversaires } from "./components/Anniversaires.js";
import { Attestations } from "./components/Attestations.js";
import { Integrations } from "./components/Integrations.js";
import { Membres } from "./components/Membres.js";
import { ReglagesIA } from "./components/ReglagesIA.js";
import { ParticipationStats } from "./components/ParticipationStats.js";
import { Organisation } from "./components/Organisation.js";
import { Statistiques } from "./components/Statistiques.js";
import { Terminaux } from "./components/Terminaux.js";
import { GouvernanceAcces } from "./components/GouvernanceAcces.js";
import { Utilisateurs } from "./components/Utilisateurs.js";
import { MatricePermissions } from "./components/MatricePermissions.js";
import { ProfilMenu } from "./components/ProfilMenu.js";
import { EspacesCollab } from "./components/EspacesCollab.js";
import { TechnicalAdmins } from "./components/TechnicalAdmins.js";

type Section =
  | "dashboard"
  | "statistiques"
  | "participation"
  | "inscriptions"
  | "engagement"
  | "demandes"
  | "membres"
  | "doublons"
  | "commissions"
  | "fonctions"
  | "niveaux"
  | "organisation"
  | "evenements"
  | "types-evenements"
  | "anniversaires"
  | "comptage"
  | "utilisateurs"
  | "gouvernance-acces"
  | "permissions"
  | "espaces-collab"
  | "technical-admins"
  | "terminaux"
  | "integrations"
  | "reglages-ia"
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
  { id: "engagement", label: "Engagement (invitations)", group: "MEMBRES", perm: "inscriptions.gerer" },
  { id: "demandes", label: "Demandes des membres", group: "MEMBRES", perm: "demandes.superviser" },
  { id: "membres", label: "Annuaire des membres", group: "MEMBRES", perm: "membres.gerer" },
  { id: "doublons", label: "Détection de doublons", group: "MEMBRES", perm: "doublons.consulter" },
  { id: "commissions", label: "Commissions & missions", group: "ORGANISATION", perm: "commissions.consulter" },
  { id: "fonctions", label: "Fonctions & titres", group: "ORGANISATION", perm: "fonctions.consulter" },
  { id: "niveaux", label: "Niveaux d'engagement", group: "ORGANISATION", perm: "niveaux-engagement.consulter" },
  { id: "organisation", label: "Coordinations & intendances", group: "ORGANISATION", perm: "organisation.consulter" },
  { id: "evenements", label: "Calendrier des événements", group: "ÉVÉNEMENTS", perm: "evenements.consulter" },
  { id: "types-evenements", label: "Types d'événements", group: "ÉVÉNEMENTS", perm: "evenements.consulter" },
  { id: "anniversaires", label: "Souhaits d'anniversaire", group: "ÉVÉNEMENTS", perm: "anniversaires.gerer" },
  { id: "comptage", label: "Comptage volet B", group: "ÉVÉNEMENTS", perm: "comptage.superviser" },
  { id: "gouvernance-acces", label: "Gouvernance des accès", group: "SYSTÈME", perm: "acces.administrer" },
  { id: "utilisateurs", label: "Accès & groupes", group: "SYSTÈME", perm: "acces.administrer" },
  { id: "permissions", label: "Matrice des permissions", group: "SYSTÈME", perm: "acces.administrer" },
  { id: "espaces-collab", label: "Espaces collaboration", group: "SYSTÈME", perm: "acces.administrer" },
  { id: "technical-admins", label: "Super-admins techniques", group: "SYSTÈME", perm: "acces.systeme" },
  { id: "terminaux", label: "Terminaux de scan", group: "SYSTÈME", perm: "terminaux.consulter" },
  { id: "integrations", label: "Intégrations & aide", group: "SYSTÈME", perm: "integrations.superviser" },
  { id: "reglages-ia", label: "Fournisseurs IA (transcription)", group: "SYSTÈME", perm: "integrations.administrer" },
  { id: "consentements", label: "Documents & consentements", group: "SYSTÈME", perm: "consentements.consulter" },
  { id: "attestations", label: "Attestations & pays", group: "SYSTÈME", perm: "attestations.gerer" },
  { id: "audit", label: "Journal d'audit", group: "SYSTÈME", perm: "audit.administrer" },
];

// The active section is carried in the URL hash (e.g. #/membres) so a browser refresh
// or a shared link lands back on the SAME section instead of the dashboard. No router
// library is added: the hash is the single source of truth, validated against NAV.
const SECTION_IDS = new Set<string>([
  "dashboard", "statistiques", "participation", "inscriptions", "engagement", "demandes",
  "membres", "doublons", "commissions", "fonctions", "niveaux", "organisation", "evenements",
  "types-evenements", "anniversaires", "comptage", "gouvernance-acces", "utilisateurs", "permissions", "espaces-collab", "terminaux",
  "integrations", "reglages-ia", "consentements", "attestations", "audit", "technical-admins",
]);
function sectionFromHash(): Section | null {
  if (typeof window === "undefined") return null;
  const raw = (window.location.hash.replace(/^#\/?/, "").split("?")[0] ?? "").trim();
  return raw && SECTION_IDS.has(raw) ? (raw as Section) : null;
}

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
  const [section, setSection] = useState<Section>(() => sectionFromHash() ?? "dashboard");

  // Navigate by writing the hash; a hashchange (link, back/forward, refresh) syncs state
  // back, so the URL and the visible section never drift apart.
  const go = useCallback((id: Section) => {
    setSection(id);
    if (typeof window !== "undefined") window.location.hash = `#/${id}`;
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onHash = (): void => {
      const s = sectionFromHash();
      if (s) setSection(s);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

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

  // Keep the URL hash aligned with the section actually shown: if the hash targets a
  // section the account cannot see (deny-by-default falls back to the first visible one)
  // or is empty, rewrite it so a further refresh is stable and never lands elsewhere.
  useEffect(() => {
    if (!session || session.permissions === undefined) return;
    const first = visibleNav[0];
    if (!first) return;
    const shown = visibleNav.find((n) => n.id === section)?.id ?? first.id;
    if (shown !== section) setSection(shown);
    if (typeof window !== "undefined" && sectionFromHash() !== shown) {
      window.location.hash = `#/${shown}`;
    }
  }, [session, visibleNav, section]);

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
                    onClick={() => go(n.id)}
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
          <ProfilMenu token={session.token} onLogout={deconnexion} />
        </header>
        <div className="main-scroll">
          {activeId === "dashboard" && <Dashboard token={session.token} />}
          {activeId === "statistiques" && <Statistiques token={session.token} />}
          {activeId === "participation" && <ParticipationStats token={session.token} />}
          {activeId === "inscriptions" && <Inscriptions token={session.token} />}
          {activeId === "engagement" && <EngagementAdmin token={session.token} />}
          {activeId === "demandes" && <DemandesAdmin token={session.token} canGerer={held.has("demandes.gerer")} />}
          {activeId === "membres" && (
            <Membres
              token={session.token}
              canAdministrer={held.has("membres.administrer")}
              canAccesAdmin={held.has("acces.administrer")}
            />
          )}
          {activeId === "doublons" && (
            <Doublons
              token={session.token}
              canStatuer={held.has("doublons.gerer")}
              canScanner={held.has("doublons.administrer")}
            />
          )}
          {activeId === "commissions" && (
            <Commissions
              token={session.token}
              canCreerCommission={held.has("commissions.administrer")}
              canGererOrg={held.has("organisation.administrer")}
            />
          )}
          {activeId === "fonctions" && <Fonctions token={session.token} canGerer={held.has("fonctions.gerer")} />}
          {activeId === "niveaux" && <Niveaux token={session.token} canGerer={held.has("niveaux-engagement.gerer")} />}
          {activeId === "organisation" && (
            <Organisation
              token={session.token}
              canGerer={held.has("organisation.administrer")}
              canGererTribus={held.has("tribus.administrer")}
            />
          )}
          {activeId === "evenements" && (
            <Evenements
              token={session.token}
              canGerer={held.has("evenements.gerer")}
              canSuperviser={held.has("evenements.superviser")}
              canParametres={held.has("parametres.gerer")}
            />
          )}
          {activeId === "types-evenements" && <TypesEvenements token={session.token} canGerer={held.has("evenements.gerer")} />}
          {activeId === "anniversaires" && <Anniversaires token={session.token} />}
          {activeId === "comptage" && <ComptageVoletB token={session.token} />}
          {activeId === "gouvernance-acces" && <GouvernanceAcces token={session.token} />}
          {activeId === "utilisateurs" && <Utilisateurs token={session.token} canSysteme={held.has("acces.systeme")} />}
          {activeId === "permissions" && <MatricePermissions token={session.token} />}
          {activeId === "espaces-collab" && <EspacesCollab token={session.token} canSysteme={held.has("acces.systeme")} />}
          {activeId === "technical-admins" && <TechnicalAdmins token={session.token} />}
          {activeId === "terminaux" && <Terminaux token={session.token} canGerer={held.has("terminaux.administrer")} />}
          {activeId === "integrations" && <Integrations token={session.token} canAdministrer={held.has("integrations.administrer")} canGererNotifs={held.has("notifications.gerer")} />}
          {activeId === "reglages-ia" && <ReglagesIA token={session.token} />}
          {activeId === "consentements" && <Consentements token={session.token} canGerer={held.has("consentements.administrer")} />}
          {activeId === "attestations" && <Attestations token={session.token} />}
          {activeId === "audit" && <JournalAudit token={session.token} />}
          {!activeId && <p className="muted">Aucune rubrique accessible avec vos permissions.</p>}
        </div>
      </main>
    </div>
  );
}
