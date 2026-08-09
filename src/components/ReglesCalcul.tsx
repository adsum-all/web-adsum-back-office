import { getReglesCalcul } from "../api.js";
import { useResource } from "../useResource.js";

const LIBELLE_AXE: Record<string, string> = {
  base: "La population de départ",
  suivi: "Axe 1, le suivi : la personne a-t-elle suivi l'activité ?",
  canal: "Axe 2, le canal : par quel moyen l'a-t-elle suivie ?",
  preuve: "Détail du présentiel : la venue est-elle prouvée ou déclarée ?",
  completude: "Axe 3, la complétude : le suivi à distance était-il entier ?",
  qualite: "Mis à part",
};

const ORDRE = ["base", "suivi", "canal", "preuve", "completude", "qualite"];

/**
 * Every published figure, with its definition, its formula and its arithmetic.
 *
 * Built because the figures could not be checked. A rate labelled "présence" counted
 * anyone whose status said they had followed, online included, and the same rate was
 * computed in six modules over four denominators. Nothing on screen let a reader tell
 * a correct number from a plausible one.
 *
 * The page states the three axes separately, because confusing two of them is what
 * produced the wrong figure. Following is one question. The channel is another. How
 * completely someone followed online is a third. A number that mixes two answers a
 * question nobody asked.
 */
export function ReglesCalcul({ token }: { token: string }): JSX.Element {
  const data = useResource(() => getReglesCalcul(token), [token]);
  const d = data.data;

  return (
    <section className="page">
      <header className="page-head">
        <h1>Règles de calcul</h1>
        <p className="muted">
          Chaque chiffre publié par la plateforme, avec ce qu&apos;il compte exactement,
          la formule qui le produit, et la vérification que l&apos;ensemble s&apos;additionne.
          Un chiffre qu&apos;on ne peut pas recalculer à la main ne devrait pas servir à décider.
        </p>
      </header>

      {data.error && <p className="banner banner-error">{data.error}</p>}
      {data.loading && <p className="muted">Chargement...</p>}

      {d && (
        <>
          <div className={`banner ${d.coherent ? "banner-ok" : "banner-error"}`}>
            {d.coherent
              ? "L'arithmétique se ferme : toutes les égalités ci-dessous sont vérifiées sur les données actuelles."
              : "Incohérence détectée. Une égalité ci-dessous ne tient pas : les chiffres affichés ailleurs sont suspects."}
          </div>

          <div className="card">
            <p className="card-title">Les trois questions posées au membre</p>
            <p className="muted small" style={{ margin: "0 0 12px" }}>
              Le formulaire pose trois questions indépendantes. Chacune donne un axe. Croiser
              deux axes produit un chiffre ; les confondre produit un faux. « Suivre » n&apos;est
              pas « être présent » : une personne qui suit en ligne a suivi, elle n&apos;était
              pas là.
            </p>
            {ORDRE.map((axe) => {
              const lignes = d.comptes.filter((c) => c.axe === axe);
              if (lignes.length === 0) return null;
              return (
                <div key={axe} style={{ marginBottom: 14 }}>
                  <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 6px" }}>{LIBELLE_AXE[axe] ?? axe}</p>
                  <div className="table-wrap">
                    <table className="table">
                      <thead>
                        <tr>
                          <th style={{ width: 90 }}>Nombre</th>
                          <th>Ce qui est compté</th>
                          <th>Part de</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lignes.map((c) => (
                          <tr key={c.code}>
                            <td className="mono" style={{ fontWeight: 700 }}>{c.valeur}</td>
                            <td>
                              <strong>{c.libelle}</strong>
                              <br />
                              <span className="muted small">{c.definition}</span>
                            </td>
                            <td className="muted small mono">{c.base || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <p className="card-title">Les taux, et comment ils sont obtenus</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>Valeur</th>
                    <th>Indicateur</th>
                    <th>Calcul</th>
                  </tr>
                </thead>
                <tbody>
                  {d.taux.map((t) => (
                    <tr key={t.code}>
                      <td className="mono" style={{ fontWeight: 700 }}>
                        {t.valeur === null ? "-" : `${t.valeur} %`}
                      </td>
                      <td>
                        <strong>{t.libelle}</strong>
                        <br />
                        <span className="muted small">{t.definition}</span>
                      </td>
                      <td className="mono small">
                        {t.numerateur} / {t.denominateur}
                        <br />
                        <span className="muted">{t.formule}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small" style={{ margin: "10px 0 0" }}>
              Un taux calculé sur une population vide affiche un tiret, pas zéro : indéfini
              et nul ne disent pas la même chose, et une ligne plate rassurerait à tort.
            </p>
          </div>

          <div className="card">
            <p className="card-title">Vérifications, recalculées à chaque affichage</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>État</th>
                    <th>Ce qui doit être vrai</th>
                    <th>Sur les données actuelles</th>
                  </tr>
                </thead>
                <tbody>
                  {d.controles.map((c) => (
                    <tr key={c.code}>
                      <td>
                        <span className={`badge ${c.verifie ? "badge-ok" : "badge-mut"}`}>
                          {c.verifie ? "Vérifié" : "ÉCHEC"}
                        </span>
                      </td>
                      <td>{c.enonce}</td>
                      <td className="mono small">{c.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {(d.brut.non_interpretables ?? 0) > 0 && (
            <p className="banner banner-warn">
              {d.brut.non_interpretables} enregistrement(s) issus de l&apos;ancien modèle ne
              sont pas interprétables : on ne sait pas si « partiel sur place » voulait dire
              arriver en retard ou suivre par intermittence. Ils sont exclus de tous les taux
              et comptés ici, plutôt que répartis au jugé.
            </p>
          )}
        </>
      )}
    </section>
  );
}
