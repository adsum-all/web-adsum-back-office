import { useCallback, useState } from "react";

import { type Session } from "./api.js";
import { Commissions } from "./components/Commissions.js";
import { ComptageVoletB } from "./components/ComptageVoletB.js";
import { ComptesMasse } from "./components/ComptesMasse.js";
import { Dashboard } from "./components/Dashboard.js";
import { DemandesAdmin } from "./components/DemandesAdmin.js";
import { Doublons } from "./components/Doublons.js";
import { Inscriptions } from "./components/Inscriptions.js";
import { Evenements } from "./components/Evenements.js";
import { JournalAudit } from "./components/JournalAudit.js";
import { Login } from "./components/Login.js";
import { Anniversaires } from "./components/Anniversaires.js";
import { Integrations } from "./components/Integrations.js";
import { Membres } from "./components/Membres.js";
import { ParticipationStats } from "./components/ParticipationStats.js";
import { Organisation } from "./components/Organisation.js";
import { Statistiques } from "./components/Statistiques.js";
import { Terminaux } from "./components/Terminaux.js";
import { Utilisateurs } from "./components/Utilisateurs.js";

type Section =
  | "dashboard"
  | "statistiques"
  | "participation"
  | "inscriptions"
  | "demandes"
  | "membres"
  | "doublons"
  | "commissions"
  | "organisation"
  | "evenements"
  | "anniversaires"
  | "comptage"
  | "utilisateurs"
  | "comptes-masse"
  | "terminaux"
  | "integrations"
  | "audit";

const NAV: { id: Section; label: string; group: string }[] = [
  { id: "dashboard", label: "Tableau de bord", group: "PILOTAGE" },
  { id: "statistiques", label: "Statistiques", group: "PILOTAGE" },
  { id: "participation", label: "Participation & assiduité", group: "PILOTAGE" },
  { id: "inscriptions", label: "Inscriptions a valider", group: "MEMBRES" },
  { id: "demandes", label: "Demandes des membres", group: "MEMBRES" },
  { id: "membres", label: "Annuaire des membres", group: "MEMBRES" },
  { id: "doublons", label: "Detection de doublons", group: "MEMBRES" },
  { id: "commissions", label: "Commissions & groupes", group: "ORGANISATION" },
  { id: "organisation", label: "Coordinations & intendances", group: "ORGANISATION" },
  { id: "evenements", label: "Calendrier des evenements", group: "EVENEMENTS" },
  { id: "anniversaires", label: "Souhaits d'anniversaire", group: "EVENEMENTS" },
  { id: "comptage", label: "Comptage volet B", group: "EVENEMENTS" },
  { id: "utilisateurs", label: "Utilisateurs & roles", group: "SYSTEME" },
  { id: "comptes-masse", label: "Creer comptes (masse)", group: "SYSTEME" },
  { id: "terminaux", label: "Terminaux de scan", group: "SYSTEME" },
  { id: "integrations", label: "Integrations & aide", group: "SYSTEME" },
  { id: "audit", label: "Journal d'audit", group: "SYSTEME" },
];

export function App(): JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [section, setSection] = useState<Section>("dashboard");

  const onAuth = useCallback((s: Session) => setSession(s), []);

  if (!session) {
    return <Login onAuth={onAuth} />;
  }

  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  const current = NAV.find((n) => n.id === section);
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
              {NAV.filter((n) => n.group === group).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`nav-item ${section === n.id ? "nav-item-active" : ""}`}
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
          <button type="button" className="link" onClick={() => setSession(null)}>
            Deconnexion
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
              placeholder="Rechercher un membre, un evenement..."
              aria-label="Recherche globale"
            />
          </label>
          <span className="event-chip" title="Evenement actif">
            <span className="event-dot" aria-hidden="true" />
            Aucun evenement actif
          </span>
          <span className="topbar-avatar" title={session.role}>
            {initials}
          </span>
        </header>
        <div className="main-scroll">
          {section === "dashboard" && <Dashboard token={session.token} />}
          {section === "statistiques" && <Statistiques token={session.token} />}
          {section === "participation" && <ParticipationStats token={session.token} />}
          {section === "inscriptions" && <Inscriptions token={session.token} />}
          {section === "demandes" && <DemandesAdmin token={session.token} />}
          {section === "membres" && <Membres token={session.token} />}
          {section === "doublons" && <Doublons token={session.token} />}
          {section === "commissions" && <Commissions token={session.token} />}
          {section === "organisation" && <Organisation token={session.token} />}
          {section === "evenements" && <Evenements token={session.token} />}
          {section === "anniversaires" && <Anniversaires token={session.token} />}
          {section === "comptage" && <ComptageVoletB token={session.token} />}
          {section === "utilisateurs" && <Utilisateurs token={session.token} />}
          {section === "comptes-masse" && <ComptesMasse token={session.token} />}
          {section === "terminaux" && <Terminaux token={session.token} />}
          {section === "integrations" && <Integrations token={session.token} />}
          {section === "audit" && <JournalAudit token={session.token} />}
        </div>
      </main>
    </div>
  );
}
