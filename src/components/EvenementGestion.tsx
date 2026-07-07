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
  envoyerSondagePointage,
  getQuestionnaireAdmin,
  getReponsesQuestionnaire,
  getTags,
  majSessionEvenement,
  reactiverEvenement,
  supprimerEvenement,
  taguerActivite,
  testDiffusionEvenement,
} from "../api.js";
import { EvenementEdition } from "./EvenementEdition.js";
import { InfoTip } from "./InfoTip.js";

/** Per-event admin panel: live session state and the post-session questionnaire
 * (builder + collected responses). The activity's configuration (links, diffusion
 * type, visibility, and every detail) is edited in EvenementEdition above. */
export function EvenementGestion({ token, evenement, onChanged }: { token: string; evenement: Evenement; onChanged: () => void }): JSX.Element {
  const [ouverte, setOuverte] = useState(!!evenement.session_ouverte);
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [titre, setTitre] = useState("Questionnaire de session");
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
  const [tagsSel, setTagsSel] = useState<string[]>((evenement.tags ?? []).map((t) => t.id));

  async function saveTags(): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      await taguerActivite(token, evenement.id, tagsSel);
      setNote("Étiquettes enregistrées. Les membres pourront filtrer par ces étiquettes.");
      onChanged();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Étiquetage impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function envoyerSondage(): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      const r = await envoyerSondagePointage(token, evenement.id);
      setNote(`Sondage de pointage envoyé : ${r.envoyes}/${r.cibles} membre(s)${r.canaux.length ? ` (${r.canaux.join(", ")})` : ""}.`);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Envoi impossible.");
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
      setNote(e instanceof Error ? e.message : "Annulation impossible.");
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
      setNote(e instanceof Error ? e.message : "Réactivation impossible.");
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
      setNote(e instanceof Error ? e.message : "Suppression impossible.");
      setConfirmSuppr(false);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void getQuestionnaireAdmin(token, evenement.id)
      .then((q) => {
        if (q) {
          setTitre(q.titre);
          setQuestions(q.questions.map((x) => ({ libelle: x.libelle, type: x.type, options: x.options })));
        }
      })
      .catch(() => undefined);
    void getReponsesQuestionnaire(token, evenement.id).then(setReponses).catch(() => undefined);
    void getTags(token).then(setTagsCatalogue).catch(() => undefined);
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

  async function saveQuestionnaire(): Promise<void> {
    const valid = questions.filter((q) => q.libelle.trim());
    if (valid.length === 0) return;
    setBusy(true);
    setNote(null);
    try {
      await definirQuestionnaire(token, evenement.id, titre, valid);
      void getReponsesQuestionnaire(token, evenement.id).then(setReponses).catch(() => undefined);
      setNote("Questionnaire enregistré.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid var(--adsum-line)", marginTop: 10, paddingTop: 12 }}>
      {note && <p className="banner banner-ok">{note}</p>}

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

      <p className="card-title" style={{ margin: "14px 0 6px" }}>Questionnaire de session</p>
      <input className="search" style={{ marginBottom: 8, width: "100%" }} value={titre} onChange={(e) => setTitre(e.target.value)} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {questions.map((q, i) => (
          <div key={i} className="toolbar">
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
            <button type="button" className="btn btn-ghost btn-inline" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
              Retirer
            </button>
          </div>
        ))}
      </div>
      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
        <button type="button" className="btn btn-ghost btn-inline" onClick={() => setQuestions((qs) => [...qs, { libelle: "", type: "texte", options: [] }])}>
          + Ajouter une question
        </button>
        <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void saveQuestionnaire()}>
          Enregistrer le questionnaire
        </button>
      </div>

      <p className="card-title" style={{ margin: "14px 0 6px" }}>Étiquettes (filtrage côté membres)</p>
      {tagsCatalogue.length === 0 ? (
        <p className="muted small">Aucune étiquette au catalogue pour l'instant.</p>
      ) : (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {tagsCatalogue.map((tg) => {
              const on = tagsSel.includes(tg.id);
              return (
                <button
                  key={tg.id}
                  type="button"
                  className={`btn btn-inline ${on ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => setTagsSel((s) => (on ? s.filter((x) => x !== tg.id) : [...s, tg.id]))}
                >
                  {tg.libelle}
                </button>
              );
            })}
          </div>
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void saveTags()}>
            Enregistrer les étiquettes
          </button>
        </>
      )}

      <p className="card-title" style={{ margin: "14px 0 6px" }}>Gestion de l'activité</p>
      {estSerie && (
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
      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 4, gap: 8, flexWrap: "wrap" }}>
        {!annule && (
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void envoyerSondage()}>
            Envoyer le sondage de pointage
          </button>
        )}
        {annule ? (
          <button type="button" className="btn btn-primary btn-inline" disabled={busy} onClick={() => void reactiverActivite()}>
            Réactiver l'activité
          </button>
        ) : (
          <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void annulerActivite()}>
            Annuler l'activité
          </button>
        )}
        {!confirmSuppr ? (
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
        )}
      </div>
      <p className="muted small" style={{ margin: "6px 0 0" }}>
        La suppression n'est possible que si aucune présence n'est enregistrée ; sinon, annulez l'activité (l'historique est conservé).
      </p>

      {reponses && reponses.total > 0 && (
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
      )}
    </div>
  );
}
