import { getStatistiques } from "../api.js";
import { useResource } from "../useResource.js";

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
            <Kpi label="Membres" value={data.membres_total} hint={`${data.membres_actifs} actifs`} />
            <Kpi label="Identites verifiees" value={data.membres_verifies} hint={`${data.membres_en_attente} en attente`} />
            <Kpi label="Evenements" value={data.evenements_total} hint={`${data.presences_total} presences`} />
            <Kpi label="Intendances" value={data.intendances_total} hint={`${data.commissions_total} commissions`} />
          </div>

          <section className="card">
            <h2 className="card-title">Membres par commission</h2>
            <BarList items={data.par_commission.map((r) => ({ label: r.commission ?? "Sans commission", value: r.total }))} />
          </section>

          <section className="card">
            <h2 className="card-title">Repartition par cheminement pastoral</h2>
            <BarList
              items={data.par_cheminement.map((r) => ({
                label: CHEMINEMENT_LABELS[r.cheminement] ?? r.cheminement ?? "-",
                value: r.total,
              }))}
            />
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: number; hint: string }): JSX.Element {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value.toLocaleString("fr-FR")}</span>
      <span className="kpi-hint">{hint}</span>
    </div>
  );
}

function BarList({ items }: { items: { label: string; value: number }[] }): JSX.Element {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="bars">
      {items.map((i) => (
        <div key={i.label} className="bar-row">
          <span className="bar-label">{i.label}</span>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(i.value / max) * 100}%` }} />
          </div>
          <span className="bar-value">{i.value}</span>
        </div>
      ))}
      {items.length === 0 && <p className="muted">Aucune donnee.</p>}
    </div>
  );
}
