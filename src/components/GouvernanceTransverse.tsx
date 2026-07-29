import { useState } from "react";

import { DeclarationsDirigeante } from "./DeclarationsDirigeante.js";
import { SupervisionTribus } from "./SupervisionTribus.js";
import { Tabs } from "./Tabs.js";

/**
 * Two responsibilities the platform recorded nowhere.
 *
 * Who answers for a tribe had no table, no screen and no history: the patriarche is
 * a different relation, since he must belong to the tribe. And the leading-team
 * membership a member declares at registration went into a field nobody could act
 * on, so people declared themselves and waited.
 *
 * They sit together because they answer the same question: who carries this
 * responsibility, and since when.
 */
export function GouvernanceTransverse({ token, canGerer }: { token: string; canGerer: boolean }): JSX.Element {
  const [tab, setTab] = useState("supervision");

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Supervision et équipe dirigeante</h1>
          <p className="muted">
            Qui répond de chaque tribu devant la gouvernance, et les appartenances à
            l&apos;équipe dirigeante déclarées à l&apos;inscription qui attendent une décision.
          </p>
        </div>
      </header>

      <Tabs
        tabs={[
          { id: "supervision", label: "Supervision des tribus" },
          { id: "declarations", label: "Déclarations équipe dirigeante" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "supervision" && <SupervisionTribus token={token} canGerer={canGerer} />}
      {tab === "declarations" && <DeclarationsDirigeante token={token} canGerer={canGerer} />}
    </div>
  );
}
