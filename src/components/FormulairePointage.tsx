import { useState } from "react";

import {
  ApiError,
  creerMotifAbsence,
  getFormulairePointage,
  modifierMotifAbsence,
  reordonnerMotifsAbsence,
} from "../api.js";
import { useResource } from "../useResource.js";
import { ApercuFormulaire } from "./ApercuFormulaire.js";

/**
 * The attendance declaration form, shown and governed in one place.
 *
 * The form decides what every statistic downstream can mean, and until now it lived
 * only inside the code of four applications: nobody could see what members were being
 * asked. This page shows the exact sequence, states the rule behind each question, and
 * makes the reason catalogue editable.
 *
 * The three first questions are deliberately not editable. Their wording carries a
 * meaning the whole counting model depends on: "suivi" is not "présence", and
 * "partiel" is an incomplete online follow-up, never an absence. Letting them be
 * rewritten would silently change what the figures count.
 */
export function FormulairePointage({ token }: { token: string }): JSX.Element {
  const data = useResource(() => getFormulairePointage(token), [token]);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [edition, setEdition] = useState<Record<string, string>>({});
  const [nouveau, setNouveau] = useState({ code: "", libelle: "", commentaire_requis: false });

  async function run(action: () => Promise<unknown>, message: string): Promise<boolean> {
    setBusy(true);
    setErreur(null);
    setNote(null);
    try {
      await action();
      setNote(message);
      data.reload();
      return true;
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const d = data.data;
  const catalogue = d?.catalogue ?? [];
  const actifs = catalogue.filter((m) => m.actif);

  function deplacer(code: string, sens: -1 | 1): void {
    const ordonne = catalogue.map((m) => m.code);
    const i = ordonne.indexOf(code);
    const j = i + sens;
    if (i < 0 || j < 0 || j >= ordonne.length) return;
    const suite = [...ordonne];
    const ici = suite[i];
    const la = suite[j];
    if (ici === undefined || la === undefined) return;
    suite[i] = la;
    suite[j] = ici;
    void run(() => reordonnerMotifsAbsence(token, suite), "Ordre enregistré.");
  }

  return (
    <section className="page">
      <header className="page-head">
        <h1>Formulaire de pointage</h1>
        <p className="muted">
          Ce que chaque membre voit après une activité, et ce que ses réponses signifient
          pour les statistiques.
        </p>
      </header>

      {data.error && <p className="banner banner-error">{data.error}</p>}
      {erreur && <p className="banner banner-error">{erreur}</p>}
      {note && <p className="banner banner-ok">{note}</p>}

      <div className="card">
        <p className="card-title">Ce qui est demandé, dans l&apos;ordre</p>
        <div className="fp-structure">
          {(d?.structure ?? []).map((q) => (
            <div key={q.rang} className="fp-question">
              <div className="fp-question-tete">
                <span className="fp-rang">{q.rang}</span>
                <strong>{q.question}</strong>
                <span className={`badge ${q.modifiable ? "badge-ok" : "badge-mut"}`}>
                  {q.modifiable ? "Administrable" : "Verrouillé"}
                </span>
              </div>
              <p className="fp-reponses">{q.reponses.join("  |  ")}</p>
              <p className="fp-regle">{q.regle}</p>
            </div>
          ))}
        </div>
        <p className="muted small" style={{ margin: "10px 0 0" }}>
          Les trois premières questions sont verrouillées parce que leur formulation porte
          le sens que comptent les statistiques : suivre n&apos;est pas être présent, et un
          suivi partiel en ligne n&apos;est jamais une absence. Les réécrire changerait
          silencieusement ce que mesurent les chiffres.
        </p>
      </div>

      <div className="card">
        <p className="card-title">Aperçu tel que le membre le voit</p>
        {d && <ApercuFormulaire titre={d.titre} questions={[]} motifs={actifs} />}
      </div>

      <div className="card">
        <p className="card-title">Catalogue des raisons d&apos;absence ({actifs.length} proposées)</p>
        <p className="muted small" style={{ margin: "0 0 10px" }}>
          Une raison se retire, elle ne se supprime pas : les absences déjà enregistrées la
          citent et perdraient leur libellé. Le code technique ne change jamais.
        </p>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Ordre</th>
                <th>Libellé proposé au membre</th>
                <th>Code</th>
                <th>Commentaire</th>
                <th>Usages</th>
                <th>État</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {catalogue.map((m, i) => (
                <tr key={m.code} className={m.actif ? "" : "fp-retire"}>
                  <td>
                    <div className="fp-ordre">
                      <button type="button" className="btn btn-ghost btn-inline" disabled={busy || i === 0} onClick={() => deplacer(m.code, -1)} aria-label="Monter">
                        &uarr;
                      </button>
                      <button type="button" className="btn btn-ghost btn-inline" disabled={busy || i === catalogue.length - 1} onClick={() => deplacer(m.code, 1)} aria-label="Descendre">
                        &darr;
                      </button>
                    </div>
                  </td>
                  <td>
                    <input
                      className="search"
                      style={{ minWidth: 240 }}
                      value={edition[m.code] ?? m.libelle}
                      onChange={(e) => setEdition((p) => ({ ...p, [m.code]: e.target.value }))}
                      onBlur={() => {
                        const valeur = (edition[m.code] ?? m.libelle).trim();
                        if (valeur && valeur !== m.libelle) {
                          void run(() => modifierMotifAbsence(token, m.code, { libelle: valeur }), "Libellé enregistré.");
                        }
                      }}
                    />
                  </td>
                  <td><span className="muted small">{m.code}</span></td>
                  <td>
                    <label className="fp-case">
                      <input
                        type="checkbox"
                        checked={m.commentaire_requis}
                        disabled={busy}
                        onChange={() =>
                          void run(
                            () => modifierMotifAbsence(token, m.code, { commentaire_requis: !m.commentaire_requis }),
                            m.commentaire_requis ? "Commentaire devenu facultatif." : "Commentaire rendu obligatoire.",
                          )
                        }
                      />
                      <span className="muted small">obligatoire</span>
                    </label>
                  </td>
                  <td><span className="muted small">{m.utilisations}</span></td>
                  <td>
                    <span className={`badge ${m.actif ? "badge-ok" : "badge-mut"}`}>{m.actif ? "Proposée" : "Retirée"}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost btn-inline"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => modifierMotifAbsence(token, m.code, { actif: !m.actif }),
                          m.actif ? "Raison retirée du formulaire." : "Raison de nouveau proposée.",
                        )
                      }
                    >
                      {m.actif ? "Retirer" : "Proposer"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="card-title" style={{ margin: "16px 0 6px" }}>Ajouter une raison</p>
        <div className="fp-ajout">
          <input
            className="search"
            placeholder="Libellé vu par le membre"
            value={nouveau.libelle}
            onChange={(e) => setNouveau((p) => ({ ...p, libelle: e.target.value }))}
          />
          <input
            className="search"
            placeholder="Code technique, par exemple deplacement_professionnel"
            value={nouveau.code}
            onChange={(e) => setNouveau((p) => ({ ...p, code: e.target.value }))}
          />
          <label className="fp-case">
            <input
              type="checkbox"
              checked={nouveau.commentaire_requis}
              onChange={(e) => setNouveau((p) => ({ ...p, commentaire_requis: e.target.checked }))}
            />
            <span className="muted small">commentaire obligatoire</span>
          </label>
          <button
            type="button"
            className="btn btn-primary btn-inline"
            disabled={busy || !nouveau.code.trim() || !nouveau.libelle.trim()}
            onClick={() =>
              void run(
                () => creerMotifAbsence(token, { code: nouveau.code.trim(), libelle: nouveau.libelle.trim(), commentaire_requis: nouveau.commentaire_requis }),
                "Raison ajoutée au catalogue.",
              ).then((ok) => {
                if (ok) setNouveau({ code: "", libelle: "", commentaire_requis: false });
              })
            }
          >
            Ajouter
          </button>
        </div>
      </div>
    </section>
  );
}
