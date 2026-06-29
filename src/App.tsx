import { useCallback, useState } from "react";

import { type Session } from "./api.js";
import { Commissions } from "./components/Commissions.js";
import { Dashboard } from "./components/Dashboard.js";
import { Evenements } from "./components/Evenements.js";
import { Login } from "./components/Login.js";
import { Membres } from "./components/Membres.js";

type Section = "dashboard" | "membres" | "commissions" | "evenements";

const NAV: { id: Section; label: string; group: string }[] = [
  { id: "dashboard", label: "Tableau de bord", group: "PILOTAGE" },
  { id: "membres", label: "Annuaire des membres", group: "MEMBRES" },
  { id: "commissions", label: "Commissions & groupes", group: "MEMBRES" },
  { id: "evenements", label: "Calendrier des evenements", group: "EVENEMENTS" },
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
        {section === "membres" && <Membres token={session.token} />}
        {section === "commissions" && <Commissions token={session.token} />}
        {section === "evenements" && <Evenements token={session.token} />}
      </main>
    </div>
  );
}
