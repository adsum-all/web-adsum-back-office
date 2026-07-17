import { useState } from "react";

import { GestionGroupes } from "./GestionGroupes.js";
import { MembresAccesTab } from "./MembresAccesTab.js";
import { Tabs } from "./Tabs.js";

const TABS = [
  { id: "groupes", label: "Groupes d'accès" },
  { id: "membres", label: "Membres avec accès plateforme" },
];

/**
 * "Accès & groupes" page, split into two tabs so long lists no longer force
 * endless scrolling: one to browse and fully manage access groups, one to see and
 * manage the members that hold platform access. Everyone is a member first; access
 * is a right granted through a group, never an identity.
 */
export function Utilisateurs({ token, canSysteme = false }: { token: string; canSysteme?: boolean }): JSX.Element {
  const [tab, setTab] = useState("groupes");

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Accès &amp; groupes</h1>
          <p className="muted">
            Chaque personne est d&apos;abord un membre. L&apos;accès au back-office, à la direction ou au
            pilotage n&apos;est pas son identité : c&apos;est un droit accordé en l&apos;ajoutant à un groupe.
            Retirer un membre d&apos;un groupe lui enlève l&apos;accès sans jamais casser son compte membre.
          </p>
        </div>
      </header>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "groupes" && <GestionGroupes token={token} canSysteme={canSysteme} />}
      {tab === "membres" && <MembresAccesTab token={token} />}
    </div>
  );
}
