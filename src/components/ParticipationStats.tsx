import { useEffect, useState } from "react";

import {
  type ParticipationStats as Stats,
  getEvenements,
  getParticipationGlobal,
  getParticipationStats,
} from "../api.js";
import { useResource } from "../useResource.js";
import { BarChart, DonutChart, LineChart, StackedBar as Bar } from "./Charts.js";
import { Kpi } from "./Kpi.js";
import { Tabs } from "./Tabs.js";

/** Shared presence palette (same hues as the stacked bars). */
const C = { present: "var(--adsum-ok)", partiel: "#b6791b", absent: "var(--adsum-danger)" };

function Legende(): JSX.Element {
  return (
    <div className="legende">
      <span><i style={{ background: C.present }} /> Présents</span>
      <span><i style={{ background: C.partiel }} /> Suivis partiels</span>
      <span><i style={{ background: C.absent }} /> Absents</span>
    </div>
  );
}

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
  const [rechercheEvenement, setRechercheEvenement] = useState("");
  const [tab, setTab] = useState("globale");
  const [eventId, setEventId] = useState<string>("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [dim, setDim] = useState<string>("commission");

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
            <div className="table-embed">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Activité</th>
                    <th>Date</th>
                    <th className="num">Présents</th>
                    <th className="num">Partiels</th>
                    <th className="num">Absents</th>
                    <th style={{ width: "28%" }}>Répartition</th>
                  </tr>
                </thead>
                <tbody>
                  {g.serie_evenements.slice(0, 10).map((ev) => (
                    <tr
                      key={ev.id}
                      className={`row-click ${eventId === ev.id ? "row-active" : ""}`}
                      title="Ouvrir le tableau de bord de cette activité"
                      onClick={() => {
                        setEventId(ev.id);
                        setTab("activite");
                      }}
                    >
                      <td style={{ fontWeight: 600 }}>{ev.titre}</td>
                      <td className="muted small">{ev.debut ? new Date(ev.debut).toLocaleDateString("fr-FR") : "-"}</td>
                      <td className="num">{ev.presents}</td>
                      <td className="num">{ev.partiels}</td>
                      <td className="num">{ev.absents}</td>
                      <td>
                        <Bar presents={ev.presents} partiels={ev.partiels} absents={ev.absents} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Legende />
            <p className="muted small" style={{ marginTop: 6 }}>Cliquez sur une activité pour ouvrir son tableau de bord détaillé.</p>
          </section>
        </>
      )}

      {tab === "activite" && (
        <section className="card">
          <h2 className="card-title">Tableau de bord d'une activité</h2>
          {/* A dropdown grows with the calendar and eventually holds hundreds of
              entries, at which point scrolling to one is slower than typing it.
              Pagination makes no sense in a select; a filter does. The list is
              datalist-backed so the native control still works on every device. */}
          <input
            className="search"
            style={{ width: "100%" }}
            list="activites-disponibles"
            placeholder="Choisir une activité : tapez pour filtrer"
            value={rechercheEvenement}
            onChange={(e) => {
              const saisie = e.target.value;
              setRechercheEvenement(saisie);
              const trouve = (evenements.data ?? []).find((ev) => ev.titre === saisie);
              setEventId(trouve ? trouve.id : "");
            }}
          />
          <datalist id="activites-disponibles">
            {(evenements.data ?? []).map((ev) => (
              <option key={ev.id} value={ev.titre} />
            ))}
          </datalist>
          {rechercheEvenement && !eventId && (
            <p className="muted small" style={{ margin: "4px 0 0" }}>
              Aucune activité ne porte exactement ce titre. Choisissez une proposition de la liste.
            </p>
          )}

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
              {/* Figures the API already computes but that were never surfaced:
                  the presence split (in-person vs online) as a share, the presence
                  rate among responders, the pending (unvalidated) drafts, and the
                  off-target presences counted apart (never in the rates). */}
              <div className="kpi-grid kpi-grid-compact">
                <Kpi label="Part présentiel" value={`${stats.part_presentiel}%`} />
                <Kpi label="Part en ligne" value={`${stats.part_en_ligne}%`} />
                <Kpi label="Taux présence (répondants)" value={`${stats.taux_presence_repondants}%`} />
                <Kpi label="Brouillons (non validés)" value={stats.brouillons} tone="mut" />
                {stats.hors_cible > 0 && (
                  <Kpi label="Présents hors cible" value={stats.hors_cible} tone="warn" />
                )}
              </div>

              <div className="card-grid-2" style={{ marginBottom: 14 }}>
                <div>
                  <p className="card-title" style={{ marginBottom: 8 }}>Modalité et niveau de suivi</p>
                  {(() => {
                    const par: Record<string, { present: number; partiel: number; absent: number }> = {};
                    for (const c of stats.croisement_modalite ?? []) {
                      const cible = par[c.modalite] ?? { present: 0, partiel: 0, absent: 0 };
                      if (c.statut === "present") cible.present = c.n;
                      else if (c.statut === "partiel") cible.partiel = c.n;
                      else cible.absent = c.n;
                      par[c.modalite] = cible;
                    }
                    const lignes = Object.entries(par);
                    if (lignes.length === 0) return <p className="muted small">Aucune participation comptée.</p>;
                    return (
                      <>
                        {lignes.map(([mod, v]) => (
                          <div key={mod} className="cohorte-row">
                            <span className="cohorte-label">{MODALITE_CROISEMENT[mod] ?? mod}</span>
                            <div style={{ flex: 1 }}>
                              <Bar presents={v.present} partiels={v.partiel} absents={v.absent} height={14} />
                            </div>
                            <span className="cohorte-count">{v.present + v.partiel + v.absent} membre(s)</span>
                          </div>
                        ))}
                        <Legende />
                      </>
                    );
                  })()}
                </div>
                <div>
                  <p className="card-title" style={{ marginBottom: 8 }}>Notes des participants ({stats.nb_notes})</p>
                  <BarChart
                    items={[1, 2, 3, 4, 5].map((n) => ({
                      label: `${n}/5`,
                      value: stats.distribution_notes.find((d) => d.note === n)?.n ?? 0,
                    }))}
                    height={170}
                    emptyMessage="Aucune note pour cette activité."
                  />
                </div>
              </div>

              <p className="card-title" style={{ marginBottom: 4 }}>Répartition par dimension</p>
              <div className="chips">
                {Object.keys(stats.repartitions)
                  .filter((d) => (stats.repartitions[d] ?? []).length > 0)
                  .map((d) => (
                    <button key={d} type="button" className={`chip ${dim === d ? "chip-active" : ""}`} onClick={() => setDim(d)}>
                      {DIM_LABELS[d] ?? d}
                    </button>
                  ))}
              </div>
              {(stats.repartitions[dim] ?? []).length > 0 ? (
                <div className="table-embed" style={{ marginBottom: 12 }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{DIM_LABELS[dim] ?? dim}</th>
                        <th className="num">Présents</th>
                        <th className="num">Partiels</th>
                        <th className="num">Absents</th>
                        <th style={{ width: "32%" }}>Répartition</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.repartitions[dim] ?? []).map((l) => (
                        <tr key={l.cle}>
                          <td style={{ fontWeight: 600 }}>{l.cle}</td>
                          <td className="num">{l.presents}</td>
                          <td className="num">{l.partiels}</td>
                          <td className="num">{l.absents}</td>
                          <td>
                            <Bar presents={l.presents} partiels={l.partiels} absents={l.absents} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="muted small">Choisissez une dimension ci-dessus.</p>
              )}

              {stats.definitions && (
                <details style={{ marginTop: 8 }}>
                  <summary className="muted small" style={{ cursor: "pointer" }}>Méthode et définitions des populations</summary>
                  <ul className="muted small" style={{ lineHeight: 1.7, margin: "8px 0 0", paddingLeft: 18 }}>
                    {Object.values(stats.definitions).map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </details>
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
            const couleur: Record<string, string> = {
              "75_100": "var(--adsum-ok)",
              "50_74": "#5b82d8",
              "25_49": "#b6791b",
              "0_24": "var(--adsum-danger)",
              sans_donnee: "var(--adsum-mut)",
            };
            return (
              <div style={{ margin: "10px 0 4px" }}>
                <p className="muted small" style={{ margin: "0 0 8px" }}>{total} membre(s) actif(s) répartis par taux de participation :</p>
                {TRANCHE_ORDRE.map((tr) => {
                  const n = dist.find((d) => d.tranche === tr)?.membres ?? 0;
                  const pct = total ? Math.round((100 * n) / total) : 0;
                  return (
                    <div key={tr} className="cohorte-row">
                      <span className="cohorte-label">{TRANCHE_LABELS[tr]}</span>
                      <div className="cohorte-track">
                        <div className="cohorte-fill" style={{ width: `${pct}%`, background: couleur[tr] }} />
                      </div>
                      <span className="cohorte-count">{n} membre(s) · {pct} %</span>
                    </div>
                  );
                })}
              </div>
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
