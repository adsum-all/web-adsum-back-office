import { useEffect, useState } from "react";

import {
  type Evenement,
  type PorteeSerie,
  type QuestionInput,
  type QuestionnaireAgregat,
  type TagItem,
  type TypeDiffusion,
  type Visibilite,
  annulerEvenement,
  definirQuestionnaire,
  publierQuestionnaire,
  envoyerSondagePointage,
  getQuestionnaireAdmin,
  getMotifsAbsenceActifs,
  getReponsesQuestionnaire,
  getTags,
  majSessionEvenement,
  reactiverEvenement,
  supprimerEvenement,
  testDiffusionEvenement,
} from "../api.js";
import { EvenementEdition } from "./EvenementEdition.js";
import { ApercuFormulaire, type MotifApercu } from "./ApercuFormulaire.js";
import { EtiquettesActivite } from "./EtiquettesActivite.js";
import { ReponsesQuestionnaire } from "./ReponsesQuestionnaire.js";
import { InfoTip } from "./InfoTip.js";
import { PiecesEvenement } from "./PiecesEvenement.js";

/** Per-event admin panel: live session state and the post-session questionnaire
 * (builder + collected responses). The activity's configuration (links, diffusion
 * type, visibility, and every detail) is edited in EvenementEdition above. */
export function EvenementGestion({
  token,
  evenement,
  canGerer = false,
  canSuperviser = false,
  onChanged,
}: {
  token: string;
  evenement: Evenement;
  // evenements.gerer: edit, session, test-diffusion, questionnaire, tags, cancel,
  // reactivate, delete.
  canGerer?: boolean;
  // evenements.superviser: only the attendance survey (POST .../sondage).
  canSuperviser?: boolean;
  onChanged: () => void;
}): JSX.Element {
  const [ouverte, setOuverte] = useState(!!evenement.session_ouverte);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [titre, setTitre] = useState("Questionnaire de session");
  const [statutForm, setStatutForm] = useState<"brouillon" | "publie" | "archive">("brouillon");
  const [versionForm, setVersionForm] = useState(0);
  const [reponsesParQuestion, setReponsesParQuestion] = useState<Record<string, number>>({});
  const [apercuOuvert, setApercuOuvert] = useState(true);
  // Failures used to be written into the success banner, so an operator read an
  // error in green and believed the save had worked.
  const [erreur, setErreur] = useState<string | null>(null);
  const [reponses, setReponses] = useState<QuestionnaireAgregat | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [annule, setAnnule] = useState(!!evenement.annule);
  const [confirmSuppr, setConfirmSuppr] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  // Scope of series actions: this date only, or every date of the series.
  const estSerie = !!evenement.serie_id;
  const [portee, setPortee] = useState<PorteeSerie>("cette_occurrence");
  const scope = estSerie ? portee : undefined;
  const [tagsCatalogue, setTagsCatalogue] = useState<TagItem[]>([]);
  // The preview must show the reasons the organisation offers today. Hard-coding them
  // once made it display entries that had already been retired, which defeats the very
  // purpose of a preview.
  const [motifs, setMotifs] = useState<MotifApercu[]>([]);


  async function envoyerSondage(): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      const r = await envoyerSondagePointage(token, evenement.id);
      setNote(`Sondage de pointage envoyé : ${r.envoyes}/${r.cibles} membre(s)${r.canaux.length ? ` (${r.canaux.join(", ")})` : ""}.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function annulerActivite(): Promise<void> {
    const motif = window.prompt("Motif de l'annulation (facultatif) :") ?? undefined;
    setBusy(true);
    setNote(null);
    try {
      await annulerEvenement(token, evenement.id, motif, scope);
      setAnnule(true);
      setNote(
        scope === "toute_la_serie"
          ? "Série annulée (toutes les dates). Les membres concernés ont été prévenus une fois."
          : "Activité annulée. Les membres concernés ont été prévenus et le sondage ne sera plus envoyé.",
      );
      onChanged();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Annulation impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function reactiverActivite(): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      await reactiverEvenement(token, evenement.id, scope);
      setAnnule(false);
      setNote(scope === "toute_la_serie" ? "Série réactivée (toutes les dates)." : "Activité réactivée.");
      onChanged();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Réactivation impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function supprimerActivite(): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      const r = await supprimerEvenement(token, evenement.id, scope);
      if (scope === "toute_la_serie") {
        setNote(
          `Série supprimée : ${r.supprimees} date(s) supprimée(s)` +
            (r.conservees > 0 ? `, ${r.conservees} conservée(s) car elles ont des présences (annulez-les plutôt).` : "."),
        );
        if (r.conservees > 0) setConfirmSuppr(false);
      }
      onChanged();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Suppression impossible.");
      setConfirmSuppr(false);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    // Loaded through the same path the save uses, so the question identifiers come
    // back and travel out again: that round trip is what keeps the answers attached.
    void rechargerQuestionnaire();
    void getReponsesQuestionnaire(token, evenement.id).then(setReponses).catch(() => undefined);
    void getTags(token).then(setTagsCatalogue).catch(() => undefined);
    void getMotifsAbsenceActifs(token).then(setMotifs).catch(() => undefined);
  }, [token, evenement.id]);

  async function saveSession(next: {
    lien_session?: string;
    liens?: string[];
    session_ouverte?: boolean;
    type_diffusion?: TypeDiffusion;
    visibilite?: Visibilite;
  }): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      const r = await majSessionEvenement(token, evenement.id, next);
      setOuverte(r.session_ouverte);
      onChanged();
      setNote("Session mise à jour.");
    } finally {
      setBusy(false);
    }
  }

  async function testDiffusion(): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      const r = await testDiffusionEvenement(token, evenement.id);
      setNote(`Test de diffusion envoyé à ${r.envoyes} membre(s).`);
    } finally {
      setBusy(false);
    }
  }

  async function saveQuestionnaire(publier: boolean): Promise<void> {
    const valid = questions.filter((q) => q.libelle.trim());
    if (valid.length === 0) {
      setErreur("Ajoutez au moins une question avant d'enregistrer.");
      return;
    }
    // Caught in front of the operator rather than by the member: an empty dropdown
    // is a question nobody can answer.
    const sansOptions = valid.find(
      (q) => q.type === "choix" && (q.options ?? []).filter((o) => o.trim()).length < 2,
    );
    if (sansOptions) {
      setErreur(`La question « ${sansOptions.libelle} » est de type Choix : donnez au moins deux options.`);
      return;
    }
    setBusy(true);
    setNote(null);
    setErreur(null);
    try {
      const r = await definirQuestionnaire(token, evenement.id, titre, valid, publier);
      setStatutForm(publier ? "publie" : "brouillon");
      setVersionForm(r.version);
      await rechargerQuestionnaire();
      void getReponsesQuestionnaire(token, evenement.id).then(setReponses).catch(() => undefined);
      const archive = r.questions_archivees > 0
        ? ` ${r.questions_archivees} question(s) retirée(s) du formulaire ont été conservées car des membres y ont déjà répondu.`
        : "";
      setNote(
        (publier
          ? `Questionnaire publié (version ${r.version}). Les membres le voient désormais.`
          : `Brouillon enregistré (version ${r.version}). Les membres ne le voient pas encore.`) + archive,
      );
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function basculerPublication(publie: boolean): Promise<void> {
    setBusy(true);
    setNote(null);
    setErreur(null);
    try {
      await publierQuestionnaire(token, evenement.id, publie);
      setStatutForm(publie ? "publie" : "brouillon");
      setNote(publie ? "Formulaire publié aux membres." : "Formulaire retiré : les membres ne le voient plus.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Publication impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function rechargerQuestionnaire(): Promise<void> {
    try {
      const q = await getQuestionnaireAdmin(token, evenement.id);
      if (!q) return;
      setTitre(q.titre);
      setStatutForm(q.statut);
      setVersionForm(q.version);
      // Identifiers travel back to the server on the next save, which is what keeps
      // the answers attached to their question.
      setQuestions(
        q.questions
          .filter((x) => !x.archivee)
          .map((x) => ({ id: x.id, libelle: x.libelle, type: x.type, options: x.options })),
      );
      setReponsesParQuestion(Object.fromEntries(q.questions.map((x) => [x.id, x.reponses])));
    } catch {
      /* the editor keeps what it has rather than emptying itself */
    }
  }

  return (
    <div style={{ borderTop: "1px solid var(--adsum-line)", marginTop: 10, paddingTop: 12 }}>
      {/* A failure never appears in the success banner again: an operator reading an
          error in green concludes the save worked. */}
      {erreur && <p className="banner banner-error">{erreur}</p>}
      {note && <p className="banner banner-ok">{note}</p>}

      {(evenement.description || evenement.intervenant_principal || (evenement.intervenants ?? []).length > 0) && (
        <div style={{ marginBottom: 12 }}>
          {evenement.description && (
            <>
              <p className="card-title" style={{ marginBottom: 6 }}>Description</p>
              <div
                className="rich-read"
                style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 10 }}
                dangerouslySetInnerHTML={{ __html: evenement.description }}
              />
            </>
          )}
          {(evenement.intervenant_principal || (evenement.intervenants ?? []).length > 0) && (
            <>
              <p className="card-title" style={{ margin: "10px 0 6px" }}>Intervenants</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {evenement.intervenant_principal && <span className="badge badge-ok">{evenement.intervenant_principal}</span>}
                {(evenement.intervenants ?? []).map((n, i) => (
                  <span key={i} className="badge badge-mut">{n}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <p className="card-title" style={{ marginBottom: 6 }}>Pièces jointes</p>
      <div style={{ marginBottom: 12 }}>
        <PiecesEvenement token={token} evenementId={evenement.id} readOnly />
      </div>

      {canGerer && (
      <>
      <div className="form-actions" style={{ justifyContent: "flex-start", marginBottom: 8 }}>
        <button type="button" className="btn btn-ghost btn-inline" onClick={() => setEditOpen((v) => !v)}>
          {editOpen ? "Fermer l'édition" : "Modifier les détails de l'activité"}
        </button>
      </div>
      {editOpen && <EvenementEdition token={token} evenement={evenement} onSaved={onChanged} />}

      <p className="card-title" style={{ marginBottom: 6 }}>Session en ligne</p>
      <p className="muted small" style={{ margin: "0 0 8px" }}>
        Les liens de diffusion, le type de diffusion et la visibilité se règlent dans « Modifier les détails de l&apos;activité » ci-dessus.
      </p>
      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
        <button
          type="button"
          className={`btn btn-inline ${ouverte ? "btn-ghost" : "btn-primary"}`}
          disabled={busy}
          onClick={() => void saveSession({ session_ouverte: !ouverte })}
        >
          {ouverte ? "Fermer la session" : "Ouvrir la session"}
        </button>
        <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void testDiffusion()}>
          Test de diffusion en live
        </button>
        <InfoTip
          title="Test de diffusion"
          text="Envoie une notification de test aux membres concernés. Le message est clairement signalé comme un test afin d'éviter toute confusion."
        />
      </div>

      <div className="toolbar" style={{ margin: "14px 0 6px", alignItems: "center" }}>
        <p className="card-title" style={{ margin: 0 }}>Formulaire de participation</p>
        <span className={`etiquette-form etiquette-form-${statutForm}`}>
          {statutForm === "publie" ? "Publié aux membres" : statutForm === "archive" ? "Archivé" : "Brouillon"}
          {versionForm > 0 && ` . version ${versionForm}`}
        </span>
        <button type="button" className="btn btn-ghost btn-inline" onClick={() => setApercuOuvert((v) => !v)}>
          {apercuOuvert ? "Masquer l'aperçu" : "Voir l'aperçu membre"}
        </button>
      </div>
      <p className="muted small" style={{ marginTop: 0 }}>
        Un brouillon n'est pas visible des membres. La publication le rend immédiatement
        répondable. Retirer une question à laquelle des membres ont déjà répondu la conserve :
        leurs réponses resteraient illisibles sans elle.
      </p>

      <input
        className="search"
        style={{ marginBottom: 8, width: "100%" }}
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        placeholder="Titre du questionnaire"
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {questions.map((q, i) => {
          const dejaRepondu = q.id ? (reponsesParQuestion[q.id] ?? 0) : 0;
          return (
            <div key={q.id ?? `nouvelle-${i}`} className="question-edit">
              <div className="toolbar">
                <input
                  className="search"
                  style={{ flex: 1 }}
                  placeholder="Intitulé de la question"
                  value={q.libelle}
                  onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, libelle: e.target.value } : x)))}
                />
                <select
                  className="search"
                  value={q.type}
                  onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))}
                >
                  <option value="texte">Texte libre</option>
                  <option value="note">Note (1-5)</option>
                  <option value="choix">Choix</option>
                </select>
                <button
                  type="button"
                  className="btn btn-ghost btn-inline"
                  title={dejaRepondu > 0 ? `${dejaRepondu} réponse(s) : la question sera conservée, pas supprimée.` : undefined}
                  onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}
                >
                  Retirer
                </button>
              </div>
              {/* Options were never editable, so every multiple-choice question
                  reached the member as an empty dropdown. */}
              {q.type === "choix" && (
                <input
                  className="search"
                  style={{ width: "100%", marginTop: 6 }}
                  placeholder="Options séparées par des virgules, par exemple : Oui, Non, Sans avis"
                  value={(q.options ?? []).join(", ")}
                  onChange={(e) =>
                    setQuestions((qs) =>
                      qs.map((x, j) =>
                        j === i ? { ...x, options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) } : x,
                      ),
                    )
                  }
                />
              )}
              {dejaRepondu > 0 && (
                <p className="muted small" style={{ margin: "4px 0 0" }}>
                  {dejaRepondu} réponse(s) déjà enregistrée(s) sur cette question.
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-ghost btn-inline" onClick={() => setQuestions((qs) => [...qs, { libelle: "", type: "texte", options: [] }])}>
          + Ajouter une question
        </button>
        <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void saveQuestionnaire(false)}>
          Enregistrer le brouillon
        </button>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void saveQuestionnaire(true)}>
          Enregistrer et publier
        </button>
        {statutForm === "publie" && (
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void basculerPublication(false)}>
            Retirer aux membres
          </button>
        )}
      </div>

      {apercuOuvert && (
        <ApercuFormulaire
          motifs={motifs}
          titre={titre}
          questions={questions.map((q) => ({ id: q.id, libelle: q.libelle, type: q.type, options: q.options }))}
        />
      )}

      <EtiquettesActivite token={token} evenementId={evenement.id} catalogue={tagsCatalogue} initial={(evenement.tags ?? []).map((t) => t.id)} onSaved={onChanged} onErreur={setErreur} />
      </>
      )}

      {(canGerer || canSuperviser) && (
        <p className="card-title" style={{ margin: "14px 0 6px" }}>Gestion de l'activité</p>
      )}
      {canGerer && estSerie && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <span className="badge badge-mut">Série récurrente</span>
          <span className="muted small">Portée :</span>
          {(["cette_occurrence", "toute_la_serie"] as PorteeSerie[]).map((v) => (
            <button
              key={v}
              type="button"
              className={`btn btn-inline ${portee === v ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setPortee(v)}
            >
              {v === "cette_occurrence" ? "Cette date" : "Toute la série"}
            </button>
          ))}
        </div>
      )}
      {annule && (
        <p className="banner banner-warn" style={{ marginBottom: 8 }}>
          Activité annulée{evenement.annule_motif ? ` : ${evenement.annule_motif}` : ""}. Elle ne déclenche plus le sondage de pointage.
        </p>
      )}
      {(canGerer || canSuperviser) && (
      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 4, gap: 8, flexWrap: "wrap" }}>
        {canSuperviser && !annule && (
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void envoyerSondage()}>
            Envoyer le sondage de pointage
          </button>
        )}
        {canGerer && (annule ? (
          <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void reactiverActivite()}>
            Réactiver l'activité
          </button>
        ) : (
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void annulerActivite()}>
            Annuler l'activité
          </button>
        ))}
        {canGerer && (!confirmSuppr ? (
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} style={{ color: "var(--adsum-danger)" }} onClick={() => setConfirmSuppr(true)}>
            Supprimer
          </button>
        ) : (
          <>
            <button type="button" className="btn btn-inline" disabled={busy} style={{ background: "var(--adsum-danger)", color: "#fff", border: "none" }} onClick={() => void supprimerActivite()}>
              Confirmer la suppression
            </button>
            <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => setConfirmSuppr(false)}>
              Annuler
            </button>
          </>
        ))}
      </div>
      )}
      {canGerer && (
      <p className="muted small" style={{ margin: "6px 0 0" }}>
        La suppression n'est possible que si aucune présence n'est enregistrée ; sinon, annulez l'activité (l'historique est conservé).
      </p>
      )}

      <ReponsesQuestionnaire reponses={reponses} />
    </div>
  );
}
