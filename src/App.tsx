import { useCallback, useState } from "react";

import { type Session } from "./api.js";
import { Commissions } from "./components/Commissions.js";
import { ComptesMasse } from "./components/ComptesMasse.js";
import { Dashboard } from "./components/Dashboard.js";
import { Doublons } from "./components/Doublons.js";
import { Evenements } from "./components/Evenements.js";
import { JournalAudit } from "./components/JournalAudit.js";
import { Login } from "./components/Login.js";
import { Membres } from "./components/Membres.js";
import { Organisation } from "./components/Organisation.js";
import { Statistiques } from "./components/Statistiques.js";
import { Terminaux } from "./components/Terminaux.js";
import { Utilisateurs } from "./components/Utilisateurs.js";

type Section =
  | "dashboard"
  | "statistiques"
  | "membres"
  | "doublons"
  | "commissions"
  | "organisation"
  | "evenements"
  | "utilisateurs"
  | "comptes-masse"
  | "terminaux"
  | "audit";

const NAV: { id: Section; label: string; group: string }[] = [
  { id: "dashboard", label: "Tableau de bord", group: "PILOTAGE" },
  { id: "statistiques", label: "Statistiques", group: "PILOTAGE" },
  { id: "membres", label: "Annuaire des membres", group: "MEMBRES" },
  { id: "doublons", label: "Detection de doublons", group: "MEMBRES" },
  { id: "commissions", label: "Commissions & groupes", group: "ORGANISATION" },
  { id: "organisation", label: "Coordinations & intendances", group: "ORGANISATION" },
  { id: "evenements", label: "Calendrier des evenements", group: "EVENEMENTS" },
  { id: "utilisateurs", label: "Utilisateurs & roles", group: "SYSTEME" },
  { id: "comptes-masse", label: "Creer comptes (masse)", group: "SYSTEME" },
  { id: "terminaux", label: "Terminaux de scan", group: "SYSTEME" },
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

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          ADSUM
          <span className="brand-sub">Back-office</span>
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
        {section === "dashboard" && <Dashboard token={session.token} />}
        {section === "statistiques" && <Statistiques token={session.token} />}
        {section === "membres" && <Membres token={session.token} />}
        {section === "doublons" && <Doublons token={session.token} />}
        {section === "commissions" && <Commissions token={session.token} />}
        {section === "organisation" && <Organisation token={session.token} />}
        {section === "evenements" && <Evenements token={session.token} />}
        {section === "utilisateurs" && <Utilisateurs token={session.token} />}
        {section === "comptes-masse" && <ComptesMasse token={session.token} />}
        {section === "terminaux" && <Terminaux token={session.token} />}
        {section === "audit" && <JournalAudit token={session.token} />}
      </main>
    </div>
  );
}
