import { useState } from "react";

import { GestionGroupes } from "./GestionGroupes.js";
import { GroupesParApplication } from "./GroupesParApplication.js";
import { MembresAccesTab } from "./MembresAccesTab.js";
import { ReconciliationAcces } from "./ReconciliationAcces.js";
import { Tabs } from "./Tabs.js";

const TABS = [
  { id: "modifiables", label: "Groupes modifiables" },
  { id: "standard", label: "Groupes standard" },
  { id: "application", label: "Par application" },
  { id: "membres", label: "Membres avec accès plateforme" },
  { id: "coherence", label: "Cohérence des accès" },
];

/**
 * "Accès & groupes" page, split into tabs so long lists no longer force endless
 * scrolling and so the two kinds of groups never get confused: custom, editable
 * groups on one tab; system, non-modifiable reference groups on another; a
 * per-application breakdown to create app-targeted groups; and the members that
 * hold platform access. Everyone is a member first; access is a right granted
 * through a group, never an identity.
 */
export function Utilisateurs({ token, canSysteme = false }: { token: string; canSysteme?: boolean }): JSX.Element {
  const [tab, setTab] = useState("modifiables");

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

      {tab === "modifiables" && <GestionGroupes token={token} canSysteme={canSysteme} portee="modifiables" />}
      {tab === "standard" && <GestionGroupes token={token} canSysteme={canSysteme} portee="standard" />}
      {tab === "application" && <GroupesParApplication token={token} canSysteme={canSysteme} />}
      {tab === "membres" && <MembresAccesTab token={token} />}
      {tab === "coherence" && <ReconciliationAcces token={token} />}
    </div>
  );
}
