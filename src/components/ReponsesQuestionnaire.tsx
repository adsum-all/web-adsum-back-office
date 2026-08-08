import type { QuestionnaireAgregat } from "../api.js";

/**
 * Aggregated answers of a session questionnaire, read-only.
 *
 * Extracted from the event panel, which had grown past the 500-line gate. This
 * block is self-contained: it renders one payload and drives nothing, so it
 * carries none of the panel's state.
 *
 * Anonymity is enforced here as well as on the server: below the threshold the
 * detail is withheld, because a handful of answers in a small group identifies
 * their author as surely as a name would.
 */
export function ReponsesQuestionnaire({ reponses }: { reponses: QuestionnaireAgregat | null }): JSX.Element | null {
  if (!reponses || reponses.total === 0) return null;
  return (
    <>
          <p className="card-title" style={{ margin: "14px 0 6px" }}>Évaluations anonymes ({reponses.total})</p>
          <p className="muted small" style={{ margin: "0 0 8px" }}>
            Totalement anonymes : ni nom, ni matricule, ni aucun lien vers un membre n'est disponible pour les notes et commentaires.
          </p>
          {!reponses.seuil_atteint ? (
            <p className="banner banner-warn">
              {reponses.total} réponse(s). Le détail s'affiche à partir de {reponses.seuil} réponses, pour préserver l'anonymat (un trop petit nombre pourrait laisser deviner l'auteur).
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {reponses.questions.map((q) => (
                <div key={q.id}>
                  <p style={{ fontWeight: 600, fontSize: 13, margin: "0 0 4px" }}>{q.libelle}</p>
                  {q.type === "note" ? (
                    <div>
                      <span className="badge badge-ok">Moyenne : {q.moyenne ?? "-"} / 5</span>
                      <span className="muted small" style={{ marginLeft: 8 }}>{q.reponses ?? 0} note(s)</span>
                      <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                        {[5, 4, 3, 2, 1].map((n) => (
                          <span key={n} className="muted small">{n}★ : {q.distribution?.[String(n)] ?? 0}</span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <ul className="list" style={{ margin: 0 }}>
                      {(q.valeurs ?? []).length === 0 ? (
                        <li className="muted small">Aucune réponse.</li>
                      ) : (
                        (q.valeurs ?? []).map((v, i) => (
                          <li key={i} className="list-row" style={{ padding: "6px 10px" }}>
                            <span className="muted small">{v}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
  );
}
