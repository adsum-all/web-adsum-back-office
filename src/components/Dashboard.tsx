import { getStatistiques } from "../api.js";
import { useResource } from "../useResource.js";
import { DonutChart, LineChart, type ChartDatum } from "./Charts.js";

const MONTHS_FR = ["janv.", "fevr.", "mars", "avr.", "mai", "juin", "juil.", "aout", "sept.", "oct.", "nov.", "dec."];

/** Turn the server "YYYY-MM" buckets into short French month labels. */
function toSeries(rows: { mois: string; total: number }[]): ChartDatum[] {
  return rows.map((r) => {
    const month = Number(r.mois.slice(5, 7)) - 1;
    return { label: MONTHS_FR[month] ?? r.mois, value: r.total };
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
          <p className="muted">Vue d'ensemble, sur les donnees reelles de la base.</p>
        </div>
      </header>

      {error && <p className="banner banner-error">{error}</p>}

      <div className="kpi-grid">
        <Kpi label="Membres" value={data?.membres_total} hint={`${data?.membres_actifs ?? 0} actifs`} loading={loading} accent />
        <Kpi
          label="Identites verifiees"
          value={data?.membres_verifies}
          hint={`${data?.membres_en_attente ?? 0} en attente`}
          loading={loading}
        />
        <Kpi
          label="Evenements"
          value={data?.evenements_total}
          hint={`${data?.presences_total ?? 0} presences`}
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
          <h2 className="card-title">Entrees de membres, 12 derniers mois</h2>
          {loading ? <p className="muted">Chargement...</p> : <LineChart points={entries} />}
        </section>
        <section className="card">
          <h2 className="card-title">Verification d'identite</h2>
          {loading || !data ? (
            <p className="muted">Chargement...</p>
          ) : (
            <DonutChart
              centerLabel="membres"
              segments={[
                { label: "Verifies", value: data.membres_verifies },
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
          <p className="muted">Aucune identite en attente de validation.</p>
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

interface KpiProps {
  label: string;
  value: number | undefined;
  hint: string;
  loading: boolean;
  accent?: boolean;
}

function Kpi({ label, value, hint, loading, accent }: KpiProps): JSX.Element {
  return (
    <div className={`kpi ${accent ? "kpi-accent" : ""}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{loading || value === undefined ? "..." : value.toLocaleString("fr-FR")}</span>
      <span className="kpi-hint">{hint}</span>
    </div>
  );
}
