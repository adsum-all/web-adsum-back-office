import { getStatistiques } from "../api.js";
import { useResource } from "../useResource.js";
import { BarChart, DonutChart } from "./Charts.js";

const CHEMINEMENT_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  en_accompagnement: "En accompagnement",
  membre_actif: "Membre actif",
  responsable: "Responsable",
  a_relancer: "A relancer",
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
          <p className="muted">Chiffres consolides, sur les donnees reelles.</p>
        </div>
      </header>

      {error && <p className="banner banner-error">{error}</p>}
      {loading && <p className="muted">Chargement...</p>}

      {data && (
        <>
          <div className="kpi-grid">
            <Kpi label="Membres" value={data.membres_total} hint={`${data.membres_actifs} actifs`} accent />
            <Kpi
              label="Identites verifiees"
              value={data.membres_verifies}
              hint={`${data.membres_en_attente} en attente`}
            />
            <Kpi label="Evenements" value={data.evenements_total} hint={`${data.presences_total} presences`} />
            <Kpi label="Intendances" value={data.intendances_total} hint={`${data.commissions_total} commissions`} />
          </div>

          <div className="card-grid-2">
            <section className="card">
              <h2 className="card-title">Repartition par cheminement pastoral</h2>
              <DonutChart
                centerLabel="membres"
                segments={data.par_cheminement.map((r) => ({
                  label: CHEMINEMENT_LABELS[r.cheminement] ?? r.cheminement ?? "-",
                  value: r.total,
                }))}
              />
            </section>
            <section className="card">
              <h2 className="card-title">Statut de verification d'identite</h2>
              <DonutChart
                centerLabel="membres"
                segments={[
                  { label: "Verifies", value: data.membres_verifies },
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
            />
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
}): JSX.Element {
  return (
    <div className={`kpi ${accent ? "kpi-accent" : ""}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value.toLocaleString("fr-FR")}</span>
      <span className="kpi-hint">{hint}</span>
    </div>
  );
}
