import { useEffect, useState } from "react";

import { getParticipationGlobal, getStatistiques } from "../api.js";
import { useResource } from "../useResource.js";
import { DonutChart, LegendeModalites, LineChart, StackedBar, type ChartDatum } from "./Charts.js";
import { Kpi } from "./Kpi.js";
import { Tabs } from "./Tabs.js";

const MONTHS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

function toSeries(rows: { mois: string; total: number }[]): ChartDatum[] {
  const spansYears = new Set(rows.map((r) => r.mois.slice(0, 4))).size > 1;
  return rows.map((r, i) => {
    const month = Number(r.mois.slice(5, 7)) - 1;
    const base = MONTHS_FR[month] ?? r.mois;
    const withYear = spansYears && (i === 0 || month === 0);
    return { label: withYear ? `${base} ${r.mois.slice(2, 4)}` : base, value: r.total };
  });
}

const TABS = [
  { id: "apercu", label: "Vue d'ensemble" },
  { id: "presence", label: "Présence par activité" },
];

export function Dashboard({ token }: { token: string }): JSX.Element {
  const { data, loading, error, reload } = useResource(() => getStatistiques(token), [token]);
  const participation = useResource(() => getParticipationGlobal(token), [token]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [tab, setTab] = useState("apercu");

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
  // presentiel and en_ligne are subsets of presents: never add them together
  // (doing so double-counted every presence on the dashboard).
  // Sur place, ce que le mot veut dire. Pas le statut, qui vaut aussi pour
  // quelqu’un ayant suivi en ligne sans se deplacer.
  const presentsCumules = rg ? rg.presentiel : 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <p className="muted">Vue d'ensemble, sur les données réelles de la base.</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span className="badge badge-ok" title="Actualisation automatique toutes les 60 secondes">
            En direct{lastUpdate ? ` · ${lastUpdate.toLocaleTimeString("fr-FR")}` : ""}
          </span>
          {/* Browser print flow: prints EXACTLY the figures on screen (same data,
              zero divergence) and doubles as PDF export via "Save as PDF". */}
          <button type="button" className="btn btn-ghost btn-inline no-print" onClick={() => window.print()}>
            Imprimer / PDF
          </button>
        </div>
      </header>

      {error && <p className="banner banner-error">{error}</p>}

      <div className="kpi-grid">
        <Kpi label="Membres" value={data?.membres_total} hint={`${data?.membres_actifs ?? 0} actifs`} loading={loading} accent />
        <Kpi label="Identités vérifiées" value={data?.membres_verifies} hint={`${data?.membres_en_attente ?? 0} en attente`} loading={loading} />
        <Kpi label="Événements" value={data?.evenements_total} hint={`${data?.presences_total ?? 0} présences`} loading={loading} />
        <Kpi label="Venues sur place, cumulé" value={rg ? presentsCumules : undefined} hint={rg ? `${rg.absents} n’ont pas suivi` : ""} loading={participation.loading} />
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "apercu" && (
        <div className="card-grid-2">
          <section className="card">
            <h2 className="card-title">Entrées de membres, 12 derniers mois</h2>
            {loading ? <p className="muted">Chargement...</p> : <LineChart points={entries} emptyMessage="Aucune entrée de membre sur la période." />}
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
      )}

      {tab === "presence" && (
        <>
          <div className="kpi-grid kpi-grid-compact">
            <Kpi label="Sur place, cumulé" value={rg ? presentsCumules : undefined} tone="ok" loading={participation.loading} />
            <Kpi label="En ligne, cumulé" value={rg?.en_ligne} tone="warn" loading={participation.loading} />
            <Kpi label="N'ont pas suivi, cumulé" value={rg?.absents} tone="bad" loading={participation.loading} />
          </div>
          <section className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <h2 className="card-title" style={{ marginBottom: 2 }}>Activités les plus récentes</h2>
              <span className="muted small">Détail complet et par période dans Participation &amp; assiduité</span>
            </div>
            {participation.loading ? (
              <p className="muted">Chargement...</p>
            ) : serie.length === 0 ? (
              <p className="muted">Aucune activité avec présence enregistrée pour le moment.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
                {serie.slice(0, 5).map((ev) => {
                  // Les personnes qui ont laissé une trace. Additionner presents et
                  // partiels omettait celles qui ont suivi en entier en ligne.
                  const total = ev.suivis + ev.absents;
                  const inconnu = Math.max(0, ev.suivis - ev.presentiel - ev.en_ligne);
                  const dateStr = ev.debut ? new Date(ev.debut).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "";
                  return (
                    <div key={ev.id}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{ev.titre} <span className="muted small">{dateStr}</span></span>
                        <span className="muted small">
                          {ev.presentiel} sur place · {ev.en_ligne} en ligne · {ev.absents} non · {total} réponses
                        </span>
                      </div>
                      <StackedBar
                        presentiel={ev.presentiel}
                        en_ligne={ev.en_ligne}
                        canal_inconnu={inconnu}
                        absent={ev.absents}
                      />
                    </div>
                  );
                })}
                <div style={{ marginTop: 2 }}><LegendeModalites /></div>
              </div>
            )}
          </section>
        </>
      )}

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
