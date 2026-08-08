// A faithful preview of what the member will actually see.
//
// The administration published blind. The editor showed a list of raw text inputs and
// a type dropdown; the member received a rating widget, a select, a textarea and an
// anonymity notice. Nobody could check, before sending, that a question read well or
// that a multiple-choice question had any options at all.
//
// So this renders the member's form, in the member's words, from the state being
// edited, and updates as it is typed. It is deliberately inert: no network call, no
// submission, no state of its own beyond the simulation the administrator picks. A
// preview that could write would eventually write.
//
// It also covers the attendance declaration, which is not a questionnaire at all but
// the form people actually complain about: three conditional questions whose branches
// nobody could inspect without opening the member application on a phone.

import { useState } from "react";

export interface QuestionApercu {
  id?: string;
  libelle: string;
  type: string;
  options?: string[];
  reponses?: number;
}

/** The situations a member can be in when the form opens. */
type Situation = "non_scanne" | "scanne" | "cloture";

const SITUATIONS: { cle: Situation; label: string; aide: string }[] = [
  { cle: "non_scanne", label: "Membre non scanné", aide: "Le cas courant : la personne déclare elle-même." },
  { cle: "scanne", label: "Membre déjà scanné", aide: "Sa présence est prouvée : le formulaire ne la redemande pas." },
  { cle: "cloture", label: "Délai dépassé", aide: "La fenêtre de réponse est fermée." },
];

export interface MotifApercu {
  code: string;
  libelle: string;
  commentaire_requis: boolean;
}

export function ApercuFormulaire({
  titre,
  questions,
  motifs,
  modeActivite = "hybride",
}: {
  titre: string;
  questions: QuestionApercu[];
  /** The live catalogue. Hard-coding it here once made the preview show reasons the
   *  organisation had already retired, which is worse than showing none: an
   *  administrator checks the preview precisely to confirm a change took effect. */
  motifs: MotifApercu[];
  modeActivite?: "presentiel" | "en_ligne" | "hybride";
}): JSX.Element {
  const [situation, setSituation] = useState<Situation>("non_scanne");
  // The preview walks the same branches as the member's form, so the administrator
  // can see where each answer leads instead of imagining it.
  const [aSuivi, setASuivi] = useState<boolean | null>(null);
  const [mode, setMode] = useState<"presentiel" | "en_ligne" | null>(null);
  const [niveau, setNiveau] = useState<"complet" | "partiel" | null>(null);
  const [motif, setMotif] = useState("");

  const visibles = questions.filter((q) => q.libelle.trim());

  return (
    <div className="apercu-formulaire">
      <div className="apercu-barre">
        <div className="segmente" role="group" aria-label="Situation simulée">
          {SITUATIONS.map((s) => (
            <button
              key={s.cle}
              type="button"
              className={`segmente-item${situation === s.cle ? " est-actif" : ""}`}
              aria-pressed={situation === s.cle}
              title={s.aide}
              onClick={() => {
                setSituation(s.cle);
                setASuivi(null);
                setMode(null);
                setNiveau(null);
                setMotif("");
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="muted small">{SITUATIONS.find((s) => s.cle === situation)?.aide}</p>
      </div>

      {/* The member's telephone, roughly. Narrow on purpose: a form that reads well
          on a desktop and badly on a phone is a form most people read badly. */}
      <div className="apercu-telephone">
        <div className="apercu-ecran">
          <p className="apercu-app">Espace membre</p>
          <h3 className="apercu-h">Déclaration de participation</h3>
          <p className="apercu-note">
            Indiquez si vous avez suivi cette activité. Cette déclaration ne remplace pas
            un pointage confirmé par l'équipe de contrôle.
          </p>

          {situation === "cloture" && (
            <p className="apercu-ferme">
              Le formulaire de participation de cette activité est clôturé.
            </p>
          )}

          {situation === "scanne" && (
            <div className="apercu-prouve">
              <strong>Votre présence en présentiel a été confirmée.</strong>
              <span>Pointage par l'équipe de contrôle. Vous pouvez laisser votre avis.</span>
            </div>
          )}

          {situation === "non_scanne" && (
            <>
              <p className="apercu-q">Avez-vous suivi cette activité ?</p>
              <div className="apercu-choix">
                <button
                  type="button"
                  className={`apercu-opt${aSuivi === true ? " est-choisi" : ""}`}
                  onClick={() => { setASuivi(true); setMotif(""); }}
                >
                  Oui, j'ai suivi cette activité
                </button>
                <button
                  type="button"
                  className={`apercu-opt${aSuivi === false ? " est-choisi" : ""}`}
                  onClick={() => { setASuivi(false); setMode(null); setNiveau(null); }}
                >
                  Non, je n'ai pas suivi cette activité
                </button>
              </div>

              {aSuivi === true && (
                <>
                  <p className="apercu-q">Comment avez-vous suivi l'activité ?</p>
                  <div className="apercu-choix apercu-choix-ligne">
                    {(modeActivite !== "en_ligne") && (
                      <button
                        type="button"
                        className={`apercu-opt${mode === "presentiel" ? " est-choisi" : ""}`}
                        onClick={() => { setMode("presentiel"); setNiveau(null); }}
                      >
                        Sur place
                      </button>
                    )}
                    {(modeActivite !== "presentiel") && (
                      <button
                        type="button"
                        className={`apercu-opt${mode === "en_ligne" ? " est-choisi" : ""}`}
                        onClick={() => setMode("en_ligne")}
                      >
                        En ligne
                      </button>
                    )}
                  </div>

                  {/* The question that only exists online. On site you were there or
                      you were not, and offering "partial" produced rows nobody could
                      interpret. */}
                  {mode === "en_ligne" && (
                    <>
                      <p className="apercu-q">Votre suivi en ligne était-il complet ou partiel ?</p>
                      <div className="apercu-choix">
                        <button
                          type="button"
                          className={`apercu-opt${niveau === "complet" ? " est-choisi" : ""}`}
                          onClick={() => setNiveau("complet")}
                        >
                          J'ai suivi l'activité en entier
                        </button>
                        <button
                          type="button"
                          className={`apercu-opt${niveau === "partiel" ? " est-choisi" : ""}`}
                          onClick={() => setNiveau("partiel")}
                        >
                          J'ai suivi une partie de l'activité
                        </button>
                      </div>
                      <p className="apercu-aide">
                        Choisissez « en entier » si vous avez suivi l'essentiel jusqu'au terme.
                        Choisissez « une partie » si vous avez suivi de façon intermittente.
                      </p>
                    </>
                  )}
                  {mode === "presentiel" && (
                    <p className="apercu-aide">
                      Votre déclaration sera enregistrée comme une présence déclarée, distincte
                      d'un pointage confirmé au contrôle.
                    </p>
                  )}
                </>
              )}

              {aSuivi === false && (
                <>
                  <p className="apercu-q">Souhaitez-vous indiquer la raison de votre absence ?</p>
                  <select
                    className="apercu-select"
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                  >
                    <option value="">Sélectionnez une raison</option>
                    {motifs.map((m) => (
                      <option key={m.code} value={m.code}>{m.libelle}</option>
                    ))}
                  </select>
                  {motifs.some((m) => m.code === motif && m.commentaire_requis) && (
                    <textarea className="apercu-texte" rows={2} placeholder="Précisez (obligatoire)" readOnly />
                  )}
                  {motifs.length === 0 && (
                    <p className="apercu-aide">
                      Aucun motif actif au catalogue : un membre ne pourrait pas justifier son absence.
                    </p>
                  )}
                  <p className="apercu-aide">
                    Votre déclaration sera transmise au responsable habilité. Elle ne devient
                    pas automatiquement une absence excusée.
                  </p>
                </>
              )}
            </>
          )}

          {situation !== "cloture" && (aSuivi !== false) && visibles.length > 0 && (
            <>
              <p className="apercu-separateur">Questionnaire de session</p>
              <p className="apercu-anonyme">
                Vos réponses à ce questionnaire sont anonymes et ne sont jamais reliées à
                votre nom.
              </p>
              <p className="apercu-titre-q">{titre}</p>
              {visibles.map((q, i) => (
                <div key={q.id ?? i} className="apercu-question">
                  <p className="apercu-q">{q.libelle}</p>
                  {q.type === "note" && (
                    <div className="apercu-notes">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span key={n} className="apercu-note-bouton">{n}</span>
                      ))}
                    </div>
                  )}
                  {q.type === "choix" && (
                    (q.options ?? []).filter((o) => o.trim()).length > 0 ? (
                      <select className="apercu-select" defaultValue="">
                        <option value="">Choisissez une réponse</option>
                        {(q.options ?? []).filter((o) => o.trim()).map((o, j) => (
                          <option key={j} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      // Shown as the defect it is, rather than as an empty dropdown the
                      // administrator would only discover through a member's complaint.
                      <p className="apercu-defaut">
                        Cette question est de type « Choix » mais n'a aucune option :
                        le membre verrait une liste vide et ne pourrait pas répondre.
                      </p>
                    )
                  )}
                  {q.type === "texte" && (
                    <textarea className="apercu-texte" rows={2} placeholder="Votre réponse" readOnly />
                  )}
                </div>
              ))}
            </>
          )}

          {situation !== "cloture" && (
            <button type="button" className="apercu-valider" disabled>
              {situation === "scanne" ? "Valider mon avis" : "Valider ma participation"}
            </button>
          )}
          {situation !== "cloture" && (
            <p className="apercu-aide">Une seule validation possible. Vérifiez avant de valider.</p>
          )}
        </div>
      </div>
    </div>
  );
}
