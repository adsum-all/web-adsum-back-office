import { useCallback, useState } from "react";

import { type DeclarationDirigeante, deciderDeclaration, getDeclarationsDirigeante } from "../api.js";
import { useResource } from "../useResource.js";
import { Pagination } from "./Pagination.js";

const FILTRES = [
  { cle: "a_traiter", libelle: "À traiter" },
  { cle: "confirmee", libelle: "Confirmées" },
  { cle: "refusee", libelle: "Refusées" },
  { cle: "toutes", libelle: "Toutes" },
];

function date(iso: string | null): string {
  if (!iso) return "date inconnue";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

/**
 * Members who declared belonging to the leading team, and what was decided.
 *
 * The registration form asks the question, the answer was written on the member and
 * read back in their file, and nothing ever happened next: no screen listed the
 * declarations and no act turned one into a membership. People declared themselves
 * and waited.
 *
 * Confirming here creates the membership of the leading team in the same
 * transaction, so the file and the team can no longer disagree. Refusing clears the
 * declared flag, so the file stops asserting what the governance has ruled out.
 */
export function DeclarationsDirigeante({ token, canGerer }: { token: string; canGerer: boolean }): JSX.Element {
  const [statut, setStatut] = useState("a_traiter");
  const [page, setPage] = useState(1);
  const [taille, setTaille] = useState(10);
  const [rechargement, setRechargement] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [commentaires, setCommentaires] = useState<Record<string, string>>({});

  const charge = useCallback(
    () => getDeclarationsDirigeante(token, statut, page, taille),
    [token, statut, page, taille, rechargement],
  );
  const res = useResource(charge, [token, statut, page, taille, rechargement]);
  const data = res.data;

  async function decider(d: DeclarationDirigeante, confirmee: boolean): Promise<void> {
    setBusy(d.id);
    setErreur(null);
    setNote(null);
    try {
      await deciderDeclaration(token, d.id, confirmee, commentaires[d.id]?.trim() || undefined);
      setNote(
        confirmee
          ? `${d.nom ?? d.email} rejoint l'équipe dirigeante. L'appartenance est créée, pas seulement la décision.`
          : `Déclaration refusée. La fiche du membre n'affirme plus l'appartenance.`,
      );
      setRechargement((v) => v + 1);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Décision impossible");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="card">
      <h2 className="card-title">Déclarations d&apos;appartenance à l&apos;équipe dirigeante</h2>
      <p className="muted">
        À l&apos;inscription, le membre déclare s&apos;il appartient à l&apos;équipe dirigeante. Cette
        déclaration attend une décision : la confirmer crée l&apos;appartenance, la refuser retire
        l&apos;affirmation de sa fiche.
      </p>

      {note && <p className="banner banner-ok">{note}</p>}
      {erreur && <p className="banner banner-error">{erreur}</p>}

      <div className="chips">
        {FILTRES.map((f) => (
          <button
            key={f.cle}
            type="button"
            className={`chip${statut === f.cle ? " chip-active" : ""}`}
            onClick={() => {
              setStatut(f.cle);
              setPage(1);
            }}
          >
            {f.libelle}
            {f.cle === "a_traiter" && data ? ` (${data.en_attente})` : ""}
          </button>
        ))}
      </div>

      {res.loading && <p className="muted">Chargement...</p>}
      {res.error && <p className="banner banner-error">{res.error}</p>}
      {!res.loading && (data?.items.length ?? 0) === 0 && (
        <p className="banner banner-info">
          {statut === "a_traiter"
            ? "Aucune déclaration en attente. Toutes ont reçu une réponse."
            : "Aucune déclaration dans cette catégorie."}
        </p>
      )}

      {(data?.items.length ?? 0) > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Déclarée le</th>
                <th>État</th>
                <th>Décision</th>
                {canGerer && <th />}
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((d) => (
                <tr key={d.id}>
                  <td>
                    <strong>{d.nom ?? "Nom non renseigné"}</strong>
                    <br />
                    <span className="muted">
                      {d.email}
                      {d.matricule ? ` · ${d.matricule}` : ""}
                    </span>
                  </td>
                  <td>{date(d.declaree_le)}</td>
                  <td>
                    {d.deja_membre ? (
                      <span className="badge badge-ok">Déjà dans l&apos;équipe</span>
                    ) : d.statut === "a_traiter" ? (
                      <span className="badge badge-warn">En attente</span>
                    ) : d.statut === "confirmee" ? (
                      <span className="badge badge-ok">Confirmée</span>
                    ) : (
                      <span className="badge badge-mut">Refusée</span>
                    )}
                  </td>
                  <td className="muted">
                    {d.traitee_le ? (
                      <>
                        {date(d.traitee_le)}
                        {d.traitee_par ? ` par ${d.traitee_par}` : ""}
                        {d.commentaire ? (
                          <>
                            <br />
                            {d.commentaire}
                          </>
                        ) : null}
                      </>
                    ) : (
                      "en attente"
                    )}
                  </td>
                  {canGerer && (
                    <td>
                      {d.statut === "a_traiter" ? (
                        <>
                          <input
                            value={commentaires[d.id] ?? ""}
                            onChange={(e) => setCommentaires((c) => ({ ...c, [d.id]: e.target.value }))}
                            placeholder="Commentaire (facultatif)"
                          />
                          <div className="row-actions">
                            <button
                              type="button"
                              className="btn btn-primary btn-inline"
                              disabled={busy === d.id}
                              onClick={() => void decider(d, true)}
                            >
                              Confirmer
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-inline"
                              disabled={busy === d.id}
                              onClick={() => void decider(d, false)}
                            >
                              Refuser
                            </button>
                          </div>
                        </>
                      ) : (
                        <span className="muted">traitée</span>
                      )}
                    </td>
                  )}
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
          libelle="déclarations"
        />
      )}
    </section>
  );
}
