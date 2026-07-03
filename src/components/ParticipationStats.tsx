import { useEffect, useState } from "react";

import {
  type ParticipationStats as Stats,
  getEvenements,
  getParticipationGlobal,
  getParticipationStats,
} from "../api.js";
import { useResource } from "../useResource.js";
import { DonutChart, LineChart, StackedBar as Bar } from "./Charts.js";
import { Kpi } from "./Kpi.js";
import { Tabs } from "./Tabs.js";

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

const TABS = [
  { id: "globale", label: "Vue globale" },
  { id: "activite", label: "Par activité" },
  { id: "assiduite", label: "Assiduité" },
];

const TRANCHE_LABELS: Record<string, string> = {
  "75_100": "Participation 75-100 %",
  "50_74": "Participation 50-74 %",
  "25_49": "Participation 25-49 %",
  "0_24": "Participation 0-24 %",
  sans_donnee: "Aucun événement sur la fenêtre",
};
const TRANCHE_ORDRE = ["75_100", "50_74", "25_49", "0_24", "sans_donnee"];

const MODALITE_CROISEMENT: Record<string, string> = {
  presentiel_prouve: "Présentiel prouvé (scan)",
  presentiel_declare: "Présentiel déclaré",
  en_ligne_declare: "En ligne (déclaré)",
  modalite_inconnue: "Modalité non précisée",
};

export function ParticipationStats({ token }: { token: string }): JSX.Element {
  const global = useResource(() => getParticipationGlobal(token), [token]);
  const evenements = useResource(() => getEvenements(token), [token]);
  const [tab, setTab] = useState("globale");
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
  const rg = g?.repartition_globale;
  const totalSuivi = rg ? rg.presents + rg.partiels + rg.absents : 0;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Statistiques de participation</h1>
          <p className="muted">Présents, partiels, absents, modalités, assiduité par cohortes et détail par activité.</p>
        </div>
        <span className="badge badge-ok" title="Actualisation automatique toutes les 30 secondes">
          En direct{lastUpdate ? ` · ${lastUpdate.toLocaleTimeString("fr-FR")}` : ""}
        </span>
      </header>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "globale" && g && rg && (
        <>
          <section className="card">
            <h2 className="card-title">Synthèse ({g.nb_evenements} événements)</h2>
            <div className="kpi-grid kpi-grid-compact">
              <Kpi label="Participations comptées" value={totalSuivi} tone="mut" />
              <Kpi label="Présents" value={rg.presents} tone="ok" />
              <Kpi label="Suivis partiels" value={rg.partiels} tone="warn" />
              <Kpi label="Absents déclarés" value={rg.absents} tone="bad" />
              <Kpi
                label="Taux de présence (déclarations comptées)"
                value={totalSuivi ? `${Math.round((100 * rg.presents) / totalSuivi)}%` : "-"}
              />
            </div>
            <div style={{ marginTop: 6 }}>
              <Bar presents={rg.presents} partiels={rg.partiels} absents={rg.absents} height={14} />
            </div>
          </section>

          <div className="card-grid-2">
            <section className="card">
              <h2 className="card-title">Modalité des présences</h2>
              <DonutChart
                segments={[
                  { label: "Présentiel prouvé (scan)", value: rg.presentiel },
                  { label: "Présentiel déclaré", value: rg.presentiel_declare ?? 0 },
                  { label: "En ligne (déclaré)", value: rg.en_ligne },
                  { label: "Modalité non précisée", value: rg.modalite_inconnue ?? 0 },
                ]}
                centerLabel={`${rg.presents}`}
              />
              <p className="muted small" style={{ marginTop: 8 }}>
                Le scan du QR membre est la seule preuve forte de présence sur place. « En ligne » est déclaratif.
              </p>
            </section>
            <section className="card">
              <h2 className="card-title">Évolution des participations (6 mois)</h2>
              <LineChart
                points={(g.evolution_mensuelle ?? []).map((m) => ({ label: m.mois, value: m.participations }))}
                height={200}
                emptyMessage="Aucune participation comptée sur la période."
              />
            </section>
          </div>

          <section className="card">
            <h2 className="card-title">Dernières activités</h2>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Activité</th>
                  <th>Date</th>
                  <th>Présents</th>
                  <th>Partiels</th>
                  <th>Absents</th>
                  <th style={{ width: "30%" }}>Répartition</th>
                </tr>
              </thead>
              <tbody>
                {g.serie_evenements.slice(0, 10).map((ev) => (
                  <tr
                    key={ev.id}
                    className={`row-click ${eventId === ev.id ? "row-active" : ""}`}
                    style={{ cursor: "pointer" }}
                    title="Ouvrir le détail de cette activité"
                    onClick={() => {
                      setEventId(ev.id);
                      setTab("activite");
                    }}
                  >
                    <td>{ev.titre}</td>
                    <td className="muted small">{ev.debut ? new Date(ev.debut).toLocaleDateString("fr-FR") : "-"}</td>
                    <td>{ev.presents}</td>
                    <td>{ev.partiels}</td>
                    <td>{ev.absents}</td>
                    <td>
                      <Bar presents={ev.presents} partiels={ev.partiels} absents={ev.absents} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="muted small" style={{ marginTop: 6 }}>Cliquez sur une activité pour ouvrir son tableau de bord détaillé.</p>
          </section>
        </>
      )}

      {tab === "activite" && (
        <section className="card">
          <h2 className="card-title">Tableau de bord d'une activité</h2>
          <select className="search" value={eventId} onChange={(e) => setEventId(e.target.value)} style={{ width: "100%" }}>
            <option value="">Choisir une activité...</option>
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
                <Kpi label="Présentiel prouvé (scan)" value={stats.presents_presentiel} />
                <Kpi label="Présentiel déclaré" value={stats.presents_presentiel_declare ?? 0} />
                <Kpi label="En ligne (déclaré)" value={stats.presents_enligne} />
                <Kpi label="Modalité non précisée" value={stats.presents_modalite_inconnue ?? 0} tone="mut" />
                <Kpi label="Note moyenne" value={stats.note_moyenne != null ? `${stats.note_moyenne}/5` : "-"} />
              </div>
              <div className="kpi-grid kpi-grid-compact">
                <Kpi label="Taux de participation" value={`${stats.taux_participation}%`} />
                <Kpi label="Taux de réponse" value={`${stats.taux_reponse}%`} />
                <Kpi label="Non-rép. connectés (fenêtre)" value={stats.non_repondants_connectes ?? 0} tone="warn" />
                <Kpi label="Non-rép. non connectés" value={stats.non_repondants_non_connectes ?? 0} tone="mut" />
              </div>

              {(stats.croisement_modalite ?? []).length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p className="card-title" style={{ marginBottom: 6 }}>Croisement modalité et niveau de suivi</p>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Modalité (niveau de preuve)</th>
                        <th>Niveau de suivi</th>
                        <th style={{ width: 80, textAlign: "right" }}>Membres</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.croisement_modalite ?? []).map((c) => (
                        <tr key={`${c.modalite}-${c.statut}`}>
                          <td>{MODALITE_CROISEMENT[c.modalite] ?? c.modalite}</td>
                          <td>{c.statut === "present" ? "Présent" : c.statut === "partiel" ? "Suivi partiel" : "Absent"}</td>
                          <td style={{ textAlign: "right", fontWeight: 600 }}>{c.n}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

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

              {stats.definitions && (
                <p className="muted small" style={{ lineHeight: 1.6 }}>
                  {Object.values(stats.definitions).join(" ")}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {tab === "assiduite" && g && (
        <section className="card">
          <h2 className="card-title">Assiduité par cohortes ({g.fenetre_assiduite_jours ?? 90} derniers jours)</h2>
          <p className="muted small" style={{ marginTop: 0 }}>
            Répartition anonyme des membres actifs par taux de participation (présent ou suivi partiel, comptés).
            Aucun classement nominatif : le détail individuel se consulte uniquement dans la fiche du membre,
            pour l'accompagner.
          </p>
          {(() => {
            const dist = g.distribution_assiduite ?? [];
            const total = dist.reduce((acc, d) => acc + d.membres, 0);
            return (
              <table className="data-table">
                <tbody>
                  {TRANCHE_ORDRE.map((tr) => {
                    const row = dist.find((d) => d.tranche === tr);
                    const n = row?.membres ?? 0;
                    return (
                      <tr key={tr}>
                        <td style={{ width: 240 }}>{TRANCHE_LABELS[tr]}</td>
                        <td>
                          <div style={{ display: "flex", height: 12, background: "var(--adsum-line)", borderRadius: 6, overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${total ? (100 * n) / total : 0}%`,
                                background: tr === "0_24" ? "var(--adsum-warn, #c07f10)" : tr === "sans_donnee" ? "var(--adsum-mut, #9aa1ad)" : "var(--adsum-ok, #1e8e5a)",
                              }}
                            />
                          </div>
                        </td>
                        <td style={{ width: 90, textAlign: "right", fontWeight: 600 }}>{n} membre(s)</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
          <p className="muted small" style={{ marginTop: 10, lineHeight: 1.6 }}>
            Méthode : pour chaque membre actif, taux = participations comptées (scan ou déclaration validée,
            présent ou partiel) rapportées aux événements de la fenêtre. Avec peu d'événements, ces taux
            se lisent comme une indication, pas comme un jugement.
          </p>
        </section>
      )}
    </div>
  );
}
