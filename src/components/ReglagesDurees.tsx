import { useCallback, useState } from "react";

import { type ReglageDuree, getReglagesDurees, setReglageDuree } from "../api.js";
import { useResource } from "../useResource.js";

/**
 * The durations the organisation decides for itself.
 *
 * Three judgements used to be made in the code and could not be revisited: how long a
 * session survives without activity, how early attendance opens, and how long an
 * activity lasts when it states no end. None of them is a technical fact. A parish
 * sharing one computer wants a short session; a prayer running forty minutes and a
 * retreat running all day are both activities.
 *
 * Everything is in minutes, with ready-made choices so nobody has to reason in raw
 * numbers, and the value is shown as somebody would say it out loud.
 */
export function ReglagesDurees({ token, canGerer }: { token: string; canGerer: boolean }): JSX.Element {
  const [rechargement, setRechargement] = useState(0);
  const charge = useCallback(() => getReglagesDurees(token), [token, rechargement]);
  const res = useResource(charge, [token, rechargement]);

  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Free-entry value per setting, so any number inside the bounds is reachable and
  // not only the suggestions.
  const [saisie, setSaisie] = useState<Record<string, string>>({});

  async function enregistrer(r: ReglageDuree, minutes: number): Promise<void> {
    setBusy(r.cle);
    setErreur(null);
    setNote(null);
    try {
      const rep = await setReglageDuree(token, r.cle, minutes);
      setNote(`« ${r.libelle} » passe à ${rep.lisible}.`);
      setSaisie((s) => ({ ...s, [r.cle]: "" }));
      setRechargement((v) => v + 1);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setBusy(null);
    }
  }

  if (res.loading) return <p className="muted">Chargement des durées...</p>;
  if (res.error) return <p className="banner banner-error">{res.error}</p>;

  return (
    <>
      <p className="muted">
        Ces durées sont propres à votre organisation. Elles sont exprimées en minutes, pour
        qu&apos;un quart d&apos;heure comme une journée entière soient exprimables. Les valeurs
        actuelles reproduisent le comportement d&apos;origine : rien ne change tant que vous ne
        décidez pas autrement.
      </p>

      {note && <p className="banner banner-ok">{note}</p>}
      {erreur && <p className="banner banner-error">{erreur}</p>}

      {(res.data?.items ?? []).map((r) => (
        <section className="card" key={r.cle}>
          <h2 className="card-title">
            {r.libelle} <span className="badge badge-info">{r.lisible}</span>
            {r.par_defaut && <span className="badge badge-mut">valeur d&apos;origine</span>}
          </h2>
          <p className="muted">{r.aide}</p>

          <div className="chips">
            {r.suggestions.map((s) => (
              <button
                key={s.minutes}
                type="button"
                className={`chip${r.minutes === s.minutes ? " chip-active" : ""}`}
                disabled={!canGerer || busy === r.cle}
                onClick={() => void enregistrer(r, s.minutes)}
              >
                {s.lisible}
              </button>
            ))}
            {r.zero_signifie && (
              <button
                type="button"
                className={`chip${r.minutes === 0 ? " chip-active" : ""}`}
                disabled={!canGerer || busy === r.cle}
                onClick={() => void enregistrer(r, 0)}
                title={r.zero_signifie}
              >
                {r.zero_signifie}
              </button>
            )}
          </div>

          {canGerer && (
            <div className="form-inline">
              <label className="field">
                <span>Autre valeur, en minutes</span>
                <input
                  type="number"
                  min={r.zero_signifie ? 0 : r.minimum}
                  max={r.maximum}
                  placeholder={`${r.minimum} à ${r.maximum}`}
                  value={saisie[r.cle] ?? ""}
                  onChange={(e) => setSaisie((s) => ({ ...s, [r.cle]: e.target.value }))}
                />
              </label>
              <button
                type="button"
                className="btn"
                disabled={busy === r.cle || !(saisie[r.cle] ?? "").trim()}
                onClick={() => void enregistrer(r, Number(saisie[r.cle]))}
              >
                Enregistrer
              </button>
              {r.minutes !== r.defaut && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy === r.cle}
                  onClick={() => void enregistrer(r, r.defaut)}
                >
                  Revenir à la valeur d&apos;origine
                </button>
              )}
            </div>
          )}
        </section>
      ))}

      <section className="card">
        <h2 className="card-title">Ce que la fermeture de session demande au retour</h2>
        <p className="muted">
          Une session fermée pour inactivité ramène la personne sur l&apos;écran de connexion,
          qui lui dit pourquoi. Elle ressaisit son mot de passe. Le code à usage unique
          n&apos;est <strong>pas</strong> redemandé si elle a accordé sa confiance à cet appareil
          et que la durée de cette confiance court encore : fermer une session ne retire jamais
          la confiance accordée à un appareil, ce sont deux choses distinctes.
        </p>
        <p className="section-title">Durée de la confiance accordée à un appareil</p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type de compte</th>
                <th>Sans code pendant</th>
                <th>Pourquoi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Super-admin technique</td>
                <td>3 jours</td>
                <td className="muted">C&apos;est l&apos;accès de secours : il porte le plus, il est vérifié le plus souvent.</td>
              </tr>
              <tr>
                <td>Personnel de la plateforme, et membre ayant activé la double authentification</td>
                <td>7 jours</td>
                <td className="muted">Le code est obligatoire pour tout compte au-delà de simple membre, quelle que soit l&apos;application où il travaille.</td>
              </tr>
              <tr>
                <td>Membre simple</td>
                <td>30 jours</td>
                <td className="muted">Aucun code pendant les 30 premiers jours du compte, puis il devient obligatoire.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
