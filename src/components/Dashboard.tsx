import { useEffect, useState } from "react";

import { getParticipationGlobal, getStatistiques } from "../api.js";
import { useResource } from "../useResource.js";
import { DonutChart, LineChart, StackedBar, type ChartDatum } from "./Charts.js";
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
  const { data, loading, error, reload } = useResource(() => getStatistiques(token), [token]);
  const participation = useResource(() => getParticipationGlobal(token), [token]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Live dashboard: figures refresh on their own so the screen can stay open
  // during a session and always show what is happening right now.
  useEffect(() => {
    const timer = window.setInterval(() => {
      reload();
      participation.reload();
      setLastUpdate(new Date());
    }, 60000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const entries = data ? toSeries(data.entrees_mensuelles) : [];
  const aVerifier = data?.membres_a_verifier ?? [];
  const serie = participation.data?.serie_evenements ?? [];
  const rg = participation.data?.repartition_globale;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <p className="muted">Vue d'ensemble, sur les données réelles de la base.</p>
        </div>
        <span className="badge badge-ok" title="Actualisation automatique toutes les 60 secondes">
          En direct{lastUpdate ? ` · ${lastUpdate.toLocaleTimeString("fr-FR")}` : ""}
        </span>
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
          label="Présents / absents"
          value={rg ? rg.presents + rg.presentiel + rg.en_ligne : undefined}
          hint={rg ? `${rg.absents} absents cumulés` : ""}
          loading={participation.loading}
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
        <h2 className="card-title">Présence par activité</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Répartition présents / partiels / absents des dernières activités. Détail complet dans Participation &amp; assiduité.
        </p>
        {participation.loading ? (
          <p className="muted">Chargement...</p>
        ) : serie.length === 0 ? (
          <p className="muted">Aucune activité avec présence enregistrée pour le moment.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {serie.slice(0, 8).map((ev) => {
              const total = ev.presents + ev.partiels + ev.absents;
              return (
                <div key={ev.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{ev.titre}</span>
                    <span className="muted small">
                      {ev.presents} présents · {ev.partiels} partiels · {ev.absents} absents ({total} attendus)
                    </span>
                  </div>
                  <StackedBar presents={ev.presents} partiels={ev.partiels} absents={ev.absents} />
                </div>
              );
            })}
            <div className="muted small" style={{ display: "flex", gap: 14, marginTop: 2 }}>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "var(--adsum-ok)", marginRight: 5 }} />Présents</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "var(--adsum-warn, #b5731a)", marginRight: 5 }} />Partiels</span>
              <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 3, background: "var(--adsum-danger)", marginRight: 5 }} />Absents</span>
            </div>
          </div>
        )}
      </section>

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
