import { useCallback, useState } from "react";

import { getTracabiliteConsentements } from "../api.js";
import { useResource } from "../useResource.js";
import { Pagination } from "./Pagination.js";

function dateHeure(iso: string | null): string {
  if (!iso) return "date inconnue";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/**
 * Who signed which consent text, in which version, and on what proof.
 *
 * The proofs were recorded from the start and readable only from inside one
 * registration file, one member at a time. "Who has signed the charter, and who has
 * not" therefore had no answer, which is the one question a consent ledger exists to
 * answer. The gap per text is shown first, because a missing signature is what
 * somebody has to act on.
 */
export function TracabiliteConsentements({ token }: { token: string }): JSX.Element {
  const [page, setPage] = useState(1);
  const [taille, setTaille] = useState(10);
  const [cle, setCle] = useState<string | undefined>(undefined);

  const charge = useCallback(
    () => getTracabiliteConsentements(token, page, taille, cle),
    [token, page, taille, cle],
  );
  const res = useResource(charge, [token, page, taille, cle]);
  const data = res.data;

  return (
    <>
      <section className="card">
        <h2 className="card-title">Signatures par texte</h2>
        <p className="muted">
          Chaque texte de consentement, le nombre de membres qui l&apos;ont signé et ceux qui ne
          l&apos;ont pas encore fait, sur {data?.membres_concernes ?? 0} membres actifs au dossier
          validé.
        </p>

        {res.loading && <p className="muted">Chargement...</p>}
        {res.error && <p className="banner banner-error">{res.error}</p>}

        {(data?.par_texte.length ?? 0) > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Texte</th>
                  <th>Version</th>
                  <th>Signataires</th>
                  <th>Manquants</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(data?.par_texte ?? []).map((t) => (
                  <tr key={t.cle}>
                    <td>
                      <strong>{t.titre}</strong>
                      {t.bloquant && (
                        <>
                          {" "}
                          <span className="badge badge-warn">obligatoire</span>
                        </>
                      )}
                      <br />
                      <span className="muted mono">{t.cle}</span>
                    </td>
                    <td>v{t.version}</td>
                    <td>{t.signataires}</td>
                    <td>
                      {t.manquants > 0 ? (
                        <span className="badge badge-bad">{t.manquants}</span>
                      ) : (
                        <span className="badge badge-ok">aucun</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-ghost btn-inline"
                        onClick={() => {
                          setCle(cle === t.cle ? undefined : t.cle);
                          setPage(1);
                        }}
                      >
                        {cle === t.cle ? "Tout voir" : "Filtrer"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">
          Signatures {cle ? `du texte ${cle}` : "recueillies"}
        </h2>
        <p className="muted">
          Chaque signature porte le canal par lequel elle a été donnée, la vérification du code et
          l&apos;empreinte de la preuve conservée.
        </p>

        {!res.loading && (data?.items.length ?? 0) === 0 && (
          <p className="banner banner-info">Aucune signature dans cette vue.</p>
        )}

        {(data?.items.length ?? 0) > 0 && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Membre</th>
                  <th>Texte</th>
                  <th>Signée le</th>
                  <th>Canal</th>
                  <th>Preuve</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items ?? []).map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.membre}</strong>
                      <br />
                      <span className="muted">
                        {s.email}
                        {s.matricule ? ` · ${s.matricule}` : ""}
                      </span>
                    </td>
                    <td>
                      {s.texte}
                      <br />
                      <span className="muted">
                        version {s.version}
                        {s.rattache_au_texte ? "" : ", non rattachée au texte"}
                      </span>
                    </td>
                    <td>{dateHeure(s.signe_le)}</td>
                    <td>
                      {s.canal ?? "non renseigné"}
                      <br />
                      {s.code_verifie ? (
                        <span className="badge badge-ok">code vérifié</span>
                      ) : (
                        <span className="badge badge-mut">sans code</span>
                      )}
                    </td>
                    <td className="mono">{s.preuve ?? "aucune"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && (
          <Pagination
            page={data.page}
            pages={data.pages}
            total={data.total}
            taille={data.taille}
            onPage={setPage}
            onTaille={(t) => {
              setTaille(t);
              setPage(1);
            }}
            libelle="signatures"
          />
        )}
      </section>
    </>
  );
}
