import { getStatistiques } from "../api.js";
import { useResource } from "../useResource.js";
import { BarChart, DonutChart } from "./Charts.js";
import { Kpi } from "./Kpi.js";

const CHEMINEMENT_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  en_accompagnement: "En accompagnement",
  membre_actif: "Membre actif",
  responsable: "Responsable",
  a_relancer: "À relancer",
  en_pause: "En pause",
  ancien_membre: "Ancien membre",
};

export function Statistiques({ token }: { token: string }): JSX.Element {
  const { data, loading, error } = useResource(() => getStatistiques(token), [token]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Statistiques & analytique</h1>
          <p className="muted">Chiffres consolidés, sur les données réelles.</p>
        </div>
      </header>

      {error && <p className="banner banner-error">{error}</p>}
      {loading && <p className="muted">Chargement...</p>}

      {data && (
        <>
          <div className="kpi-grid">
            <Kpi label="Membres" value={data.membres_total} hint={`${data.membres_actifs} actifs`} accent />
            <Kpi
              label="Identités vérifiées"
              value={data.membres_verifies}
              hint={`${data.membres_en_attente} en attente`}
            />
            <Kpi label="Événements" value={data.evenements_total} hint={`${data.presences_total} présences`} />
            <Kpi label="Intendances" value={data.intendances_total} hint={`${data.commissions_total} commissions`} />
          </div>

          <div className="card-grid-2">
            <section className="card">
              <h2 className="card-title">Répartition par cheminement pastoral</h2>
              <DonutChart
                centerLabel="membres"
                segments={data.par_cheminement.map((r) => ({
                  label: CHEMINEMENT_LABELS[r.cheminement] ?? r.cheminement ?? "-",
                  value: r.total,
                }))}
              />
            </section>
            <section className="card">
              <h2 className="card-title">Statut de vérification d'identité</h2>
              <DonutChart
                centerLabel="membres"
                segments={[
                  { label: "Vérifiés", value: data.membres_verifies },
                  { label: "En attente", value: data.membres_en_attente },
                ]}
              />
            </section>
          </div>

          <section className="card">
            <h2 className="card-title">Membres par commission</h2>
            <BarChart
              items={data.par_commission.map((r) => ({
                label: r.commission ?? "Sans",
                value: r.total,
              }))}
              emptyMessage="Aucun membre rattaché à une commission pour le moment."
            />
          </section>
        </>
      )}
    </div>
  );
}
