import { getCommissions, getEvenements, getMembres } from "../api.js";
import { useResource } from "../useResource.js";

export function Dashboard({ token }: { token: string }): JSX.Element {
  const membres = useResource(() => getMembres(token, { limit: 2000 }), [token]);
  const evenements = useResource(() => getEvenements(token), [token]);
  const commissions = useResource(() => getCommissions(token), [token]);

  const list = membres.data ?? [];
  const verifies = list.filter((m) => m.verifie).length;
  const actifs = list.filter((m) => m.statut === "actif").length;
  const enAttente = list.filter((m) => !m.verifie).length;

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
        <Kpi label="Membres" value={list.length} hint={`${actifs} actifs`} loading={membres.loading} />
        <Kpi label="Identites verifiees" value={verifies} hint={`${enAttente} en attente`} loading={membres.loading} />
        <Kpi label="Evenements" value={(evenements.data ?? []).length} hint="salle + en ligne" loading={evenements.loading} />
        <Kpi
          label="Commissions"
          value={(commissions.data ?? []).length}
          hint="groupes de la fraternite"
          loading={commissions.loading}
        />
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
}

function Kpi({ label, value, hint, loading }: KpiProps): JSX.Element {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{loading ? "..." : value.toLocaleString("fr-FR")}</span>
      <span className="kpi-hint">{hint}</span>
    </div>
  );
}
