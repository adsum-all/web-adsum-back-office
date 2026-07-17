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
            <Kpi
              label="Intendances"
              value={data.intendances_total}
              hint={`${data.commissions_total} commissions · ${data.missions_total} missions`}
            />
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
            <h2 className="card-title">Membres par commission / mission</h2>
            <BarChart
              items={data.par_commission.map((r) => ({
                label: r.commission ?? "Sans",
                value: r.total,
              }))}
              emptyMessage="Aucun membre rattaché à une commission ou mission pour le moment."
            />
          </section>

          <section className="card">
            <h2 className="card-title">Répartition des activités par type</h2>
            <p className="muted small">Part de chaque type d&apos;événement dans les activités programmées, avec sa couleur de calendrier.</p>
            {(() => {
              const types = (data.par_type_evenement ?? []).filter((r) => r.total > 0);
              const maxTotal = Math.max(1, ...types.map((r) => r.total));
              if (types.length === 0) return <p className="muted">Aucune activité programmée pour le moment.</p>;
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                  {types.map((r) => (
                    <div key={r.nom} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span aria-hidden style={{ width: 14, height: 14, borderRadius: 4, background: r.couleur, border: "1px solid rgba(0,0,0,0.15)", flexShrink: 0 }} />
                      <span style={{ flex: "0 0 190px", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nom}</span>
                      <span style={{ flex: 1, height: 12, background: "var(--adsum-line, #e4e8ee)", borderRadius: 999, overflow: "hidden" }}>
                        <span style={{ display: "block", height: "100%", width: `${Math.round((r.total / maxTotal) * 100)}%`, background: r.couleur, borderRadius: 999 }} />
                      </span>
                      <span style={{ flex: "0 0 96px", textAlign: "right", fontSize: 12, fontFamily: "monospace" }}>{r.total} · {r.pourcentage}%</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>
        </>
      )}
    </div>
  );
}
