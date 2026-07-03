import { useEffect, useState } from "react";

import {
  type ParticipationStats as Stats,
  getEvenements,
  getParticipationGlobal,
  getParticipationStats,
} from "../api.js";
import { useResource } from "../useResource.js";
import { StackedBar as Bar } from "./Charts.js";
import { Kpi } from "./Kpi.js";

const DIM_LABELS: Record<string, string> = {
  genre: "Genre",
  tranche_age: "Tranche d'âge",
  commission: "Commission",
  intendance: "Intendance",
  coordination: "Coordination",
  tribu: "Tribu",
  pays: "Pays",
  region: "Région",
  type_membre: "Type de membre",
  cheminement: "Cheminement",
};



export function ParticipationStats({ token }: { token: string }): JSX.Element {
  const global = useResource(() => getParticipationGlobal(token), [token]);
  const evenements = useResource(() => getEvenements(token), [token]);
  const [eventId, setEventId] = useState<string>("");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!eventId) {
      setStats(null);
      return;
    }
    void getParticipationStats(token, eventId).then(setStats).catch(() => setStats(null));
  }, [token, eventId]);

  // Live view: presence figures refresh on their own while a session runs.
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => {
      global.reload();
      if (eventId) void getParticipationStats(token, eventId).then(setStats).catch(() => undefined);
      setLastUpdate(new Date());
    }, 30000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, eventId]);

  const g = global.data;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Statistiques de participation</h1>
          <p className="muted">Présents, partiels, absents, non-répondants, présentiel/en ligne, notes et répartitions.</p>
        </div>
        <span className="badge badge-ok" title="Actualisation automatique toutes les 30 secondes">
          En direct{lastUpdate ? ` · ${lastUpdate.toLocaleTimeString("fr-FR")}` : ""}
        </span>
      </header>

      {g && (
        <section className="card">
          <h2 className="card-title">Vue globale ({g.nb_evenements} événements)</h2>
          <div className="kpi-grid kpi-grid-compact">
            <Kpi label="Présences (présentiel)" value={g.repartition_globale.presentiel} tone="ok" />
            <Kpi label="Présences (en ligne)" value={g.repartition_globale.en_ligne} tone="ok" />
            <Kpi label="Suivis partiels" value={g.repartition_globale.partiels} tone="warn" />
            <Kpi label="Absents" value={g.repartition_globale.absents} tone="bad" />
          </div>
          <div className="card-grid-2">
            <div>
              <p className="card-title" style={{ marginBottom: 6 }}>Membres les plus assidus</p>
              <ul className="list">
                {g.top_assidus.slice(0, 6).map((m) => (
                  <li key={m.matricule} className="list-row">
                    <strong>{m.membre || m.matricule}</strong>
                    <span className="badge badge-ok">{m.presents} présences</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="card-title" style={{ marginBottom: 6 }}>À relancer (faible assiduité)</p>
              <ul className="list">
                {g.a_relancer.slice(0, 6).map((m) => (
                  <li key={m.matricule} className="list-row">
                    <strong>{m.membre || m.matricule}</strong>
                    <span className="badge badge-warn">{m.presents} présences</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="card-title">Détail par événement</h2>
        <select className="search" value={eventId} onChange={(e) => setEventId(e.target.value)} style={{ width: "100%" }}>
          <option value="">Choisir un événement...</option>
          {(evenements.data ?? []).map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.titre}
            </option>
          ))}
        </select>

        {stats && (
          <div style={{ marginTop: 14 }}>
            <div className="kpi-grid kpi-grid-compact">
              <Kpi label="Effectif attendu" value={stats.effectif_attendu} tone="mut" />
              <Kpi label={`Présents (${stats.taux_presence}%)`} value={stats.presents} tone="ok" />
              <Kpi label={`Partiels (${stats.taux_partiel}%)`} value={stats.partiels} tone="warn" />
              <Kpi label={`Absents (${stats.taux_absence}%)`} value={stats.absents} tone="bad" />
              <Kpi label={`Non-répondants (${stats.taux_non_reponse}%)`} value={stats.non_repondants} tone="mut" />
            </div>
            <div className="kpi-grid kpi-grid-compact">
              <Kpi label="Présentiel (scan)" value={stats.presents_presentiel} />
              <Kpi label="En ligne (déclaré)" value={stats.presents_enligne} />
              <Kpi label="Taux de participation" value={`${stats.taux_participation}%`} />
              <Kpi label="Taux de réponse" value={`${stats.taux_reponse}%`} />
              <Kpi label="Note moyenne" value={stats.note_moyenne != null ? `${stats.note_moyenne}/5` : "-"} />
            </div>

            {stats.distribution_notes.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p className="card-title" style={{ marginBottom: 6 }}>Distribution des notes ({stats.nb_notes})</p>
                <table className="data-table">
                  <tbody>
                    {stats.distribution_notes.map((d) => (
                      <tr key={d.note}>
                        <td style={{ width: 60 }}>{d.note}/5</td>
                        <td>
                          <div style={{ display: "flex", height: 10, background: "var(--adsum-line)", borderRadius: 6, overflow: "hidden" }}>
                            <div style={{ width: `${(100 * d.n) / Math.max(1, stats.nb_notes)}%`, background: "var(--adsum-acc, #2a4fad)" }} />
                          </div>
                        </td>
                        <td style={{ width: 40, textAlign: "right" }}>{d.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {Object.entries(stats.repartitions).map(([dim, lignes]) =>
              lignes.length > 0 ? (
                <div key={dim} style={{ marginBottom: 14 }}>
                  <p className="card-title" style={{ marginBottom: 6 }}>Répartition par {DIM_LABELS[dim] ?? dim}</p>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{DIM_LABELS[dim] ?? dim}</th>
                        <th>Présents</th>
                        <th>Partiels</th>
                        <th>Absents</th>
                        <th style={{ width: "35%" }}>Répartition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lignes.map((l) => (
                        <tr key={l.cle}>
                          <td>{l.cle}</td>
                          <td>{l.presents}</td>
                          <td>{l.partiels}</td>
                          <td>{l.absents}</td>
                          <td>
                            <Bar presents={l.presents} partiels={l.partiels} absents={l.absents} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null,
            )}
          </div>
        )}
      </section>
    </div>
  );
}
