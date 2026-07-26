import { getReconciliationAcces } from "../api.js";
import { useResource } from "../useResource.js";

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super-administration",
  admin: "Administration",
  gestionnaire: "Gestion des membres",
  direction: "Direction",
  controleur: "Contrôle",
};

/**
 * Where the account role and the access groups disagree.
 *
 * The platform states that access is granted only by putting a member in a group,
 * but what is enforced starts from the role cached on the account, which can be set
 * on its own. Nothing compared the two, so the claim could not be checked. This screen
 * compares them and, above all, keeps two very different situations apart: an account
 * bound to a member, which can be aligned without gaining anything since it already
 * holds the role, and a technical account with no member, which cannot belong to any
 * group at all and must therefore stay under review rather than be stripped.
 */
export function ReconciliationAcces({ token }: { token: string }): JSX.Element {
  const donnees = useResource(() => getReconciliationAcces(token), [token]);

  if (donnees.loading) return <p className="muted">Analyse des accès...</p>;
  if (donnees.error) return <p className="banner banner-error">{donnees.error}</p>;
  if (!donnees.data) return <p className="muted">Aucune donnée.</p>;

  const { resume, alignables, comptes_techniques, explication } = donnees.data;
  const coherent = alignables.length === 0;

  return (
    <div>
      <header className="page-head">
        <div>
          <h2 className="section-title">Cohérence des accès</h2>
          <p className="muted small">
            Un accès doit venir d&apos;un groupe. Cet écran montre les comptes dont le rôle n&apos;est adossé à
            aucun groupe, afin qu&apos;aucun droit ne subsiste sans justification visible.
          </p>
        </div>
      </header>

      <div className="reconc-chiffres">
        <div className="reconc-chiffre">
          <span className="reconc-valeur">{resume.comptes_privilegies_actifs}</span>
          <span className="reconc-label">comptes privilégiés actifs</span>
        </div>
        <div className="reconc-chiffre">
          <span className="reconc-valeur reconc-ok">{resume.adosses_a_un_groupe}</span>
          <span className="reconc-label">adossés à un groupe</span>
        </div>
        <div className="reconc-chiffre">
          <span className={`reconc-valeur ${resume.alignables ? "reconc-alerte" : "reconc-ok"}`}>{resume.alignables}</span>
          <span className="reconc-label">à aligner</span>
        </div>
        <div className="reconc-chiffre">
          <span className="reconc-valeur">{resume.comptes_techniques_sans_membre}</span>
          <span className="reconc-label">comptes techniques</span>
        </div>
      </div>

      <p className="banner banner-info small">{explication}</p>

      <section className="reconc-section">
        <h3 className="section-title">Comptes à aligner</h3>
        {coherent ? (
          <p className="muted">
            Aucun écart : chaque compte privilégié rattaché à un membre tient son rôle d&apos;un groupe.
          </p>
        ) : (
          <>
            <p className="muted small">
              Ces comptes détiennent déjà leur rôle. Leur accorder le groupe correspondant ne leur ajoute aucun
              droit, cela rend seulement les deux sources cohérentes.
            </p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Compte</th>
                    <th>Rôle détenu</th>
                    <th>Groupe qui le porterait</th>
                  </tr>
                </thead>
                <tbody>
                  {alignables.map((c) => (
                    <tr key={c.utilisateur_id}>
                      <td>
                        <div className="event-main">
                          <strong>{c.nom ?? c.email}</strong>
                          {c.nom ? <span className="muted small">{c.email}</span> : null}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-ok">{ROLE_LABEL[c.role] ?? c.role}</span>
                      </td>
                      <td className="muted small">
                        {c.groupe_suggere ? c.groupe_suggere.libelle : "Aucun groupe standard pour ce rôle"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="reconc-section">
        <h3 className="section-title">Comptes techniques sans membre</h3>
        <p className="muted small">
          Ces comptes ne sont rattachés à aucune personne. L&apos;appartenance à un groupe se fait par le membre :
          ils ne peuvent donc appartenir à aucun groupe, et leur retirer leur rôle fermerait la plateforme. Ils
          sont listés ici pour rester sous revue.
        </p>
        {comptes_techniques.length === 0 ? (
          <p className="muted">Aucun compte technique.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Compte</th>
                  <th>Rôle détenu</th>
                </tr>
              </thead>
              <tbody>
                {comptes_techniques.map((c) => (
                  <tr key={c.utilisateur_id}>
                    <td className="mono small">{c.email}</td>
                    <td>
                      <span className="badge badge-mut">{ROLE_LABEL[c.role] ?? c.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
