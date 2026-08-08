import { useState } from "react";

import {
  ApiError,
  getEmailFournisseurs,
  saveEmailCommun,
  saveEmailFournisseur,
  setEmailChaine,
  testEmailFournisseur,
  type FournisseurEmail,
} from "../api.js";
import { useResource } from "../useResource.js";

/**
 * Change the e-mail provider from the back office, in clicks.
 *
 * The order on screen is the order the operation must follow: fill the fields,
 * send a real test, then activate. Activation is offered only once the server
 * says the provider is ready, and the test goes through that provider alone, so
 * "it works" is about the provider being switched to and not about the one
 * currently sending.
 *
 * A secret is never sent back to the browser. Its field stays empty and an empty
 * submit leaves the stored value untouched, so opening the screen and saving an
 * unrelated field can never wipe a working key.
 */
export function FournisseursEmail({ token }: { token: string }): JSX.Element {
  const data = useResource(() => getEmailFournisseurs(token), [token]);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saisie, setSaisie] = useState<Record<string, string>>({});
  const [destinataire, setDestinataire] = useState("");
  const [resultat, setResultat] = useState<Record<string, string>>({});
  const [ouvert, setOuvert] = useState<string | null>(null);

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
  const chaine = d?.chaine ?? [];
  const fournisseurs = d?.fournisseurs ?? [];
  const principal = fournisseurs.find((f) => f.actif);

  function champsDe(f: FournisseurEmail): Record<string, string> {
    const out: Record<string, string> = {};
    for (const c of f.champs) {
      const v = saisie[c.cle];
      if (v !== undefined) out[c.cle] = v;
      else if (!c.secret) out[c.cle] = c.valeur;
    }
    return out;
  }

  async function tester(f: FournisseurEmail): Promise<void> {
    setBusy(true);
    setErreur(null);
    setNote(null);
    try {
      const r = await testEmailFournisseur(token, f.code, destinataire.trim() || undefined);
      setResultat((p) => ({
        ...p,
        [f.code]: r.envoye
          ? `Message parti par ${f.libelle} vers ${r.destinataire ?? "votre adresse"}. Vérifiez la réception avant d'activer.`
          : `Échec : ${r.erreur || "le fournisseur a refusé l'envoi."}`,
      }));
    } catch (err) {
      setErreur(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page">
      <header className="page-head">
        <h1>Fournisseur d&apos;envoi des e-mails</h1>
        <p className="muted">
          Changez de fournisseur sans redéploiement. Renseignez, testez, puis activez : un
          fournisseur incomplet ne peut pas être activé, et le test passe par lui seul.
        </p>
      </header>

      {data.error && <p className="banner banner-error">{data.error}</p>}
      {erreur && <p className="banner banner-error">{erreur}</p>}
      {note && <p className="banner banner-ok">{note}</p>}

      {(d?.alertes ?? []).map((a) => (
        <div key={a.titre} className={`fe-alerte fe-alerte-${a.niveau}`}>
          <strong>{a.titre}</strong>
          <span>{a.detail}</span>
        </div>
      ))}

      <div className="fe-actif">
        <span className="fe-actif-label">Actuellement</span>
        <strong>{principal ? principal.libelle : "aucun fournisseur actif"}</strong>
        {chaine.length > 1 && (
          <span className="fe-actif-secours">
            puis, en cas d&apos;échec : {chaine.slice(1).map((c) => fournisseurs.find((f) => f.code === c)?.libelle ?? c).join(", ")}
          </span>
        )}
      </div>

      {d && (
        <details className="fe-bloc">
          <summary>Identité de l&apos;expéditeur, commune à tous les fournisseurs</summary>
          <div className="fe-champs">
            {d.commun.map((c) => (
              <label key={c.cle} className="fe-champ">
                <span className="fe-champ-titre">
                  {c.libelle}
                  {!c.requis && <em> (facultatif)</em>}
                </span>
                {c.aide && <span className="fe-champ-aide">{c.aide}</span>}
                <input
                  type="text"
                  placeholder={c.exemple}
                  value={saisie[c.cle] ?? c.valeur}
                  onChange={(e) => setSaisie((p) => ({ ...p, [c.cle]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-inline"
            disabled={busy}
            onClick={() => {
              const v: Record<string, string> = {};
              for (const c of d.commun) v[c.cle] = saisie[c.cle] ?? c.valeur;
              void run(() => saveEmailCommun(token, v), "Identité d'expéditeur enregistrée.");
            }}
          >
            Enregistrer l&apos;identité
          </button>
        </details>
      )}

      <div className="fe-grille">
        {fournisseurs.map((f) => (
          <article key={f.code} className={`card fe-carte${f.actif ? " fe-carte-actif" : ""}`}>
            <header className="fe-carte-tete">
              <h2>{f.libelle}</h2>
              <span className={`fe-etat fe-etat-${f.actif ? "actif" : f.secours ? "secours" : f.pret ? "pret" : "incomplet"}`}>
                {f.actif ? "Actif" : f.secours ? `Secours (rang ${(f.rang ?? 0) + 1})` : f.pret ? "Prêt" : "Incomplet"}
              </span>
            </header>
            <p className="fe-resume">{f.resume}</p>
            {f.limite && <p className="fe-limite">{f.limite}</p>}
            {!f.pret && f.manquant.length > 0 && (
              <p className="fe-manquant">À renseigner : {f.manquant.join(", ")}.</p>
            )}

            {f.champs.length > 0 && (
              <button type="button" className="btn btn-ghost btn-inline" onClick={() => setOuvert(ouvert === f.code ? null : f.code)}>
                {ouvert === f.code ? "Masquer la configuration" : "Configurer"}
              </button>
            )}

            {ouvert === f.code && (
              <div className="fe-config">
                {f.preselections.length > 0 && (
                  <div className="fe-presets">
                    <span className="fe-champ-aide">Renseigner automatiquement le serveur :</span>
                    <div className="fe-presets-boutons">
                      {f.preselections.map((p) => (
                        <button
                          key={p.libelle}
                          type="button"
                          className="btn btn-ghost btn-inline"
                          onClick={() =>
                            setSaisie((prev) => {
                              const suite = { ...prev };
                              for (const [k, v] of Object.entries(p)) if (k !== "libelle") suite[k] = v;
                              return suite;
                            })
                          }
                        >
                          {p.libelle}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="fe-champs">
                  {f.champs.map((c) => (
                    <label key={c.cle} className="fe-champ">
                      <span className="fe-champ-titre">
                        {c.libelle}
                        {!c.requis && <em> (facultatif)</em>}
                      </span>
                      {c.aide && <span className="fe-champ-aide">{c.aide}</span>}
                      <input
                        type={c.secret ? "password" : "text"}
                        autoComplete={c.secret ? "new-password" : "off"}
                        placeholder={c.secret && c.renseigne ? "Renseigné, laissez vide pour conserver" : c.exemple}
                        value={saisie[c.cle] ?? (c.secret ? "" : c.valeur)}
                        onChange={(e) => setSaisie((p) => ({ ...p, [c.cle]: e.target.value }))}
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-inline"
                  disabled={busy}
                  onClick={() => void run(() => saveEmailFournisseur(token, f.code, champsDe(f)), `${f.libelle} enregistré.`)}
                >
                  Enregistrer {f.libelle}
                </button>
              </div>
            )}

            <div className="fe-actions">
              <button type="button" className="btn btn-ghost btn-inline" disabled={busy || !f.pret} onClick={() => void tester(f)}>
                Envoyer un test
              </button>
              {!f.actif && (
                <button
                  type="button"
                  className="btn btn-primary btn-inline"
                  disabled={busy || !f.pret}
                  onClick={() =>
                    void run(
                      () => setEmailChaine(token, [f.code, ...chaine.filter((c) => c !== f.code)]),
                      `${f.libelle} est désormais le fournisseur principal.`,
                    )
                  }
                >
                  Activer comme principal
                </button>
              )}
              {!f.actif && !f.secours && f.pret && chaine.length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-inline"
                  disabled={busy}
                  onClick={() => void run(() => setEmailChaine(token, [...chaine, f.code]), `${f.libelle} ajouté en secours.`)}
                >
                  Ajouter en secours
                </button>
              )}
              {f.secours && (
                <button
                  type="button"
                  className="btn btn-ghost btn-inline"
                  disabled={busy}
                  onClick={() => void run(() => setEmailChaine(token, chaine.filter((c) => c !== f.code)), `${f.libelle} retiré du secours.`)}
                >
                  Retirer du secours
                </button>
              )}
            </div>

            {resultat[f.code] && <p className="fe-resultat">{resultat[f.code]}</p>}
          </article>
        ))}
      </div>

      <div className="fe-destinataire">
        <label className="fe-champ">
          <span className="fe-champ-titre">Adresse qui reçoit les tests</span>
          <span className="fe-champ-aide">Vide, le test part vers votre propre adresse de connexion.</span>
          <input type="email" placeholder="vous@exemple.fr" value={destinataire} onChange={(e) => setDestinataire(e.target.value)} />
        </label>
      </div>
    </section>
  );
}
