import { getDoublons } from "../api.js";
import { fullName } from "../format.js";
import { useResource } from "../useResource.js";

const CRITERE_LABELS: Record<string, string> = {
  telephone: "Meme numero de telephone",
  nom: "Meme nom et prenom",
};

export function Doublons({ token }: { token: string }): JSX.Element {
  const { data, loading, error } = useResource(() => getDoublons(token), [token]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Detection de doublons</h1>
          <p className="muted">
            Verification anti double-inscription: un membre ne doit pas etre enregistre deux fois.
          </p>
        </div>
      </header>

      {error && <p className="banner banner-error">{error}</p>}
      {loading && <p className="muted">Analyse en cours...</p>}
      {data && data.length === 0 && (
        <p className="banner banner-ok">Aucun doublon detecte. L'annuaire est sain.</p>
      )}

      {(data ?? []).map((group, idx) => (
        <section className="card" key={`${group.critere}-${group.valeur}-${idx}`}>
          <h2 className="card-title">
            {CRITERE_LABELS[group.critere] ?? group.critere} : <span className="mono">{group.valeur}</span>
            <span className="badge badge-warn"> {group.membres.length} profils</span>
          </h2>
          <ul className="list">
            {group.membres.map((m) => (
              <li key={m.id} className="list-row">
                <div className="event-main">
                  <strong>{fullName(m.prenoms, m.nom, m.matricule)}</strong>
                  <span className="muted">
                    {m.matricule} . {m.email} . {m.telephone ?? "-"}
                  </span>
                </div>
                <span className={`badge ${m.verifie ? "badge-ok" : "badge-warn"}`}>
                  {m.verifie ? "VERIFIE" : "A VERIFIER"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
