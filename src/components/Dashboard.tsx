import { getCommissions, getEvenements, getMembres, type MembreProfile } from "../api.js";
import { useResource } from "../useResource.js";
import { DonutChart, LineChart, type ChartDatum } from "./Charts.js";

const MONTHS_FR = ["janv.", "fevr.", "mars", "avr.", "mai", "juin", "juil.", "aout", "sept.", "oct.", "nov.", "dec."];

/** Build a 12-month time series of member entries from real date_entree values. */
function monthlyEntries(list: MembreProfile[]): ChartDatum[] {
  const now = new Date();
  const buckets: ChartDatum[] = [];
  const index = new Map<string, number>();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    index.set(key, buckets.length);
    buckets.push({ label: MONTHS_FR[d.getMonth()] ?? "", value: 0 });
  }
  for (const m of list) {
    if (!m.date_entree) continue;
    const d = new Date(m.date_entree);
    if (Number.isNaN(d.getTime())) continue;
    const pos = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    const bucket = pos === undefined ? undefined : buckets[pos];
    if (bucket) bucket.value += 1;
  }
  return buckets;
}

export function Dashboard({ token }: { token: string }): JSX.Element {
  const membres = useResource(() => getMembres(token, { limit: 2000 }), [token]);
  const evenements = useResource(() => getEvenements(token), [token]);
  const commissions = useResource(() => getCommissions(token), [token]);

  const list = membres.data ?? [];
  const verifies = list.filter((m) => m.verifie).length;
  const actifs = list.filter((m) => m.statut === "actif").length;
  const enAttente = list.filter((m) => !m.verifie).length;
  const entries = monthlyEntries(list);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tableau de bord</h1>
          <p className="muted">Vue d'ensemble, sur les donnees reelles de la base.</p>
        </div>
      </header>

      {membres.error && <p className="banner banner-error">{membres.error}</p>}

      <div className="kpi-grid">
        <Kpi label="Membres" value={list.length} hint={`${actifs} actifs`} loading={membres.loading} accent />
        <Kpi label="Identites verifiees" value={verifies} hint={`${enAttente} en attente`} loading={membres.loading} />
        <Kpi
          label="Evenements"
          value={(evenements.data ?? []).length}
          hint="salle + en ligne"
          loading={evenements.loading}
        />
        <Kpi
          label="Commissions"
          value={(commissions.data ?? []).length}
          hint="groupes de la fraternite"
          loading={commissions.loading}
        />
      </div>

      <div className="card-grid-2">
        <section className="card">
          <h2 className="card-title">Entrees de membres, 12 derniers mois</h2>
          {membres.loading ? <p className="muted">Chargement...</p> : <LineChart points={entries} />}
        </section>
        <section className="card">
          <h2 className="card-title">Verification d'identite</h2>
          {membres.loading ? (
            <p className="muted">Chargement...</p>
          ) : (
            <DonutChart
              centerLabel="membres"
              segments={[
                { label: "Verifies", value: verifies },
                { label: "En attente", value: enAttente },
              ]}
            />
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="card-title">Validations en attente</h2>
        {membres.loading ? (
          <p className="muted">Chargement...</p>
        ) : enAttente === 0 ? (
          <p className="muted">Aucune identite en attente de validation.</p>
        ) : (
          <ul className="mini-list">
            {list
              .filter((m) => !m.verifie)
              .slice(0, 8)
              .map((m) => (
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
  value: number;
  hint: string;
  loading: boolean;
  accent?: boolean;
}

function Kpi({ label, value, hint, loading, accent }: KpiProps): JSX.Element {
  return (
    <div className={`kpi ${accent ? "kpi-accent" : ""}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{loading ? "..." : value.toLocaleString("fr-FR")}</span>
      <span className="kpi-hint">{hint}</span>
    </div>
  );
}
