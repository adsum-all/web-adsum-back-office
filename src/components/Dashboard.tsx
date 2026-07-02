import { getStatistiques } from "../api.js";
import { useResource } from "../useResource.js";
import { DonutChart, LineChart, type ChartDatum } from "./Charts.js";
import { Kpi } from "./Kpi.js";

const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/**
 * Turn the server "YYYY-MM" buckets into short French month labels. When the
 * window spans two calendar years, the two-digit year is appended to the first
 * point and to every January so the reading stays unambiguous.
 */
function toSeries(rows: { mois: string; total: number }[]): ChartDatum[] {
  const spansYears = new Set(rows.map((r) => r.mois.slice(0, 4))).size > 1;
  return rows.map((r, i) => {
    const month = Number(r.mois.slice(5, 7)) - 1;
    const base = MONTHS_FR[month] ?? r.mois;
    const withYear = spansYears && (i === 0 || month === 0);
    return { label: withYear ? `${base} ${r.mois.slice(2, 4)}` : base, value: r.total };
  });
}

export function Dashboard({ token }: { token: string }): JSX.Element {
  const { data, loading, error } = useResource(() => getStatistiques(token), [token]);

  const entries = data ? toSeries(data.entrees_mensuelles) : [];
  const aVerifier = data?.membres_a_verifier ?? [];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <p className="muted">Vue d'ensemble, sur les données réelles de la base.</p>
        </div>
      </header>

      {error && <p className="banner banner-error">{error}</p>}

      <div className="kpi-grid">
        <Kpi label="Membres" value={data?.membres_total} hint={`${data?.membres_actifs ?? 0} actifs`} loading={loading} accent />
        <Kpi
          label="Identités vérifiées"
          value={data?.membres_verifies}
          hint={`${data?.membres_en_attente ?? 0} en attente`}
          loading={loading}
        />
        <Kpi
          label="Événements"
          value={data?.evenements_total}
          hint={`${data?.presences_total ?? 0} présences`}
          loading={loading}
        />
        <Kpi
          label="Commissions"
          value={data?.commissions_total}
          hint={`${data?.intendances_total ?? 0} intendances`}
          loading={loading}
        />
      </div>

      <div className="card-grid-2">
        <section className="card">
          <h2 className="card-title">Entrées de membres, 12 derniers mois</h2>
          {loading ? (
            <p className="muted">Chargement...</p>
          ) : (
            <LineChart points={entries} emptyMessage="Aucune entrée de membre sur la période." />
          )}
        </section>
        <section className="card">
          <h2 className="card-title">Vérification d'identité</h2>
          {loading || !data ? (
            <p className="muted">Chargement...</p>
          ) : (
            <DonutChart
              centerLabel="membres"
              segments={[
                { label: "Vérifiés", value: data.membres_verifies },
                { label: "En attente", value: data.membres_en_attente },
              ]}
            />
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="card-title">Validations en attente</h2>
        {loading ? (
          <p className="muted">Chargement...</p>
        ) : aVerifier.length === 0 ? (
          <p className="muted">Aucune identité en attente de validation.</p>
        ) : (
          <ul className="mini-list">
            {aVerifier.map((m) => (
              <li key={m.id}>
                <span>{`${m.prenoms ?? ""} ${m.nom ?? ""}`.trim() || m.matricule}</span>
                <span className="muted">{m.matricule}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
