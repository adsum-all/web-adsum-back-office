import { useState } from "react";

import { type InscriptionFiltre, getInscriptionCompteurs } from "../api.js";
import { useResource } from "../useResource.js";
import { CreerComptesMasse } from "./CreerComptesMasse.js";
import { CreerCompteMembre } from "./CreerCompteMembre.js";
import { InscriptionsBloquees } from "./InscriptionsBloquees.js";
import { RevueInscriptions } from "./RevueInscriptions.js";
import { Tabs } from "./Tabs.js";

const LIST_TABS: { id: InscriptionFiltre; label: string }[] = [
  { id: "en_cours", label: "Inscriptions en cours" },
  { id: "recus", label: "Formulaires reçus" },
  { id: "a_valider", label: "À valider" },
  { id: "validees", label: "Validées" },
];

/**
 * "Inscriptions à valider" page, reorganized into logical tabs that follow the real
 * registration workflow: create one account, create accounts in bulk, then one
 * queue per lifecycle stage (in progress, form returned, to validate, validated).
 * No more sifting a mixed list; counts badge each stage.
 */
export function Inscriptions({ token }: { token: string }): JSX.Element {
  const [tab, setTab] = useState("creer");
  const compteurs = useResource(() => getInscriptionCompteurs(token), [token], 10000);
  const c = compteurs.data;

  const tabs = [
    { id: "creer", label: "Créer un compte membre" },
    { id: "masse", label: "Créer des comptes en masse" },
    ...LIST_TABS.map((t) => ({ id: t.id, label: c ? `${t.label} (${c[t.id]})` : t.label })),
    // The queues above show where a dossier stands. This one answers the other
    // question, the one nobody could answer: who registered and never got in.
    { id: "bloquees", label: "Inscriptions bloquées" },
  ];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Inscriptions</h1>
          <p className="muted">
            Création de compte (un ou en masse), puis suivi du dossier étape par étape jusqu&apos;à la validation.
          </p>
        </div>
      </header>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "creer" && <CreerCompteMembre token={token} onCreated={() => compteurs.reload()} />}
      {tab === "masse" && <CreerComptesMasse token={token} onCreated={() => compteurs.reload()} />}
      {/* key={tab} remounts the queue on every tab change, so a dossier opened in one
          stage never stays open when moving to another stage (no cross-tab confusion). */}
      {LIST_TABS.some((t) => t.id === tab) && <RevueInscriptions key={tab} token={token} filtre={tab as InscriptionFiltre} />}
      {tab === "bloquees" && <InscriptionsBloquees token={token} />}
    </div>
  );
}
