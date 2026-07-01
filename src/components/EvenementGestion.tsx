import { useEffect, useState } from "react";

import {
  type Evenement,
  type QuestionInput,
  type ReponseQuestionnaire,
  type TypeDiffusion,
  type Visibilite,
  definirQuestionnaire,
  getQuestionnaireAdmin,
  getReponsesQuestionnaire,
  majSessionEvenement,
  testDiffusionEvenement,
} from "../api.js";
import { InfoTip } from "./InfoTip.js";

/** Per-event admin panel: live session link/state and the post-session
 * questionnaire (builder + collected responses). */
export function EvenementGestion({ token, evenement, onChanged }: { token: string; evenement: Evenement; onChanged: () => void }): JSX.Element {
  const [lien, setLien] = useState(evenement.lien_session ?? "");
  const [ouverte, setOuverte] = useState(!!evenement.session_ouverte);
  const [diffusion, setDiffusion] = useState<TypeDiffusion>(evenement.type_diffusion ?? "aucun");
  const [visibilite, setVisibilite] = useState<Visibilite>(evenement.visibilite ?? "membres");
  const [questions, setQuestions] = useState<QuestionInput[]>([]);
  const [titre, setTitre] = useState("Questionnaire de session");
  const [reponses, setReponses] = useState<ReponseQuestionnaire[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

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
  }, [token, evenement.id]);

  async function saveSession(next: {
    lien_session?: string;
    session_ouverte?: boolean;
    type_diffusion?: TypeDiffusion;
    visibilite?: Visibilite;
  }): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      const r = await majSessionEvenement(token, evenement.id, next);
      setOuverte(r.session_ouverte);
      setLien(r.lien_session ?? "");
      onChanged();
      setNote("Session mise a jour.");
    } finally {
      setBusy(false);
    }
  }

  async function testDiffusion(): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      const r = await testDiffusionEvenement(token, evenement.id);
      setNote(`Test de diffusion envoye a ${r.envoyes} membre(s).`);
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
      setNote("Questionnaire enregistre.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ borderTop: "1px solid var(--adsum-line)", marginTop: 10, paddingTop: 12 }}>
      {note && <p className="banner banner-ok">{note}</p>}

      <p className="card-title" style={{ marginBottom: 6 }}>Session en ligne</p>
      <div className="toolbar">
        <input
          className="search"
          style={{ flex: 1 }}
          placeholder="Lien de session (Zoom, Meet...)"
          value={lien}
          onChange={(e) => setLien(e.target.value)}
        />
        <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void saveSession({ lien_session: lien })}>
          Enregistrer le lien
        </button>
        <button
          type="button"
          className={`btn btn-inline ${ouverte ? "btn-ghost" : "btn-primary"}`}
          disabled={busy}
          onClick={() => void saveSession({ session_ouverte: !ouverte })}
        >
          {ouverte ? "Fermer la session" : "Ouvrir la session"}
        </button>
      </div>

      <div className="toolbar" style={{ marginTop: 10 }}>
        <label style={{ flex: 1 }}>
          <span className="muted small">Type de diffusion</span>
          <select
            className="search"
            style={{ width: "100%" }}
            value={diffusion}
            onChange={(e) => {
              const next = e.target.value as TypeDiffusion;
              setDiffusion(next);
              void saveSession({ type_diffusion: next });
            }}
          >
            <option value="aucun">Aucune</option>
            <option value="embed">Diffusion integree (embed)</option>
            <option value="externe">Lien externe</option>
          </select>
        </label>
        <label style={{ flex: 1 }}>
          <span className="muted small">Visibilite</span>
          <select
            className="search"
            style={{ width: "100%" }}
            value={visibilite}
            onChange={(e) => {
              const next = e.target.value as Visibilite;
              setVisibilite(next);
              void saveSession({ visibilite: next });
            }}
          >
            <option value="public">Public</option>
            <option value="membres">Membres</option>
            <option value="prive">Prive</option>
          </select>
        </label>
      </div>

      <div className="form-actions" style={{ justifyContent: "flex-start", marginTop: 8 }}>
        <button type="button" className="btn btn-ghost btn-inline" disabled={busy} onClick={() => void testDiffusion()}>
          Test de diffusion en live
        </button>
        <InfoTip
          title="Test de diffusion"
          text="Envoie une notification de test aux membres concernes. Le message est clairement signale comme un test afin d'eviter toute confusion."
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
              placeholder="Intitule de la question"
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

      {reponses.length > 0 && (
        <>
          <p className="card-title" style={{ margin: "14px 0 6px" }}>Reponses ({reponses.length})</p>
          <ul className="list">
            {reponses.map((r, i) => (
              <li key={i} className="list-row">
                <div className="event-main">
                  <strong>{r.membre_nom}</strong>
                  <span className="muted small">
                    {Object.values(r.reponses).join(" . ")}
                  </span>
                </div>
                <span className="muted small">{r.matricule}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
