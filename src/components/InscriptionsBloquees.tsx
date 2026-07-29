import { useCallback, useState } from "react";

import {
  type EnvoiEmail,
  type InscriptionBloquee,
  type ReparationApercu,
  type ReparationResultat,
  getEnvoisEmailMembre,
  getInscriptionsAReparer,
  getSanteEmail,
  reparerInscriptions,
} from "../api.js";
import { useResource } from "../useResource.js";
import { Pagination } from "./Pagination.js";

const GRAVITE_CLASSE: Record<string, string> = {
  bloquant: "badge-bad",
  attention: "badge-warn",
  information: "badge-mut",
};

const GRAVITE_LIBELLE: Record<string, string> = {
  bloquant: "Bloquant",
  attention: "À relancer",
  information: "En cours",
};

function date(iso: string | null): string {
  if (!iso) return "date inconnue";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function dateHeure(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

/** Everything the platform tried to send to one member, and what became of it. */
function HistoriqueEnvois({ token, membreId }: { token: string; membreId: string }): JSX.Element {
  const res = useResource(() => getEnvoisEmailMembre(token, membreId), [token, membreId]);
  if (res.loading) return <p className="muted">Chargement de l&apos;historique...</p>;
  if (res.error) return <p className="banner banner-error">{res.error}</p>;
  const envois: EnvoiEmail[] = res.data?.envois ?? [];
  if (envois.length === 0) {
    return (
      <p className="banner banner-info">
        Aucun envoi enregistré pour ce membre. Renvoyer l&apos;invitation créera une trace fiable.
      </p>
    );
  }
  return (
    <ul className="list">
      {envois.map((e) => (
        <li key={e.id} className="list-row">
          <div className="event-main">
            <strong>{e.sujet ?? e.template ?? "Message"}</strong>
            <span className="muted">
              {e.destinataire} · {dateHeure(e.cree_le)}
              {e.fournisseur ? ` · ${e.fournisseur}` : ""}
              {e.erreur ? ` · ${e.erreur}` : ""}
            </span>
            {e.evenements.length > 0 && (
              <span className="muted">
                {e.evenements
                  .map((ev) => `${ev.evenement_fournisseur} le ${dateHeure(ev.survenu_le)}`)
                  .join(" · ")}
              </span>
            )}
          </div>
          <span className={`badge ${e.statut === "delivre" || e.statut === "ouvert" ? "badge-ok" : e.statut === "envoye" ? "badge-info" : "badge-warn"}`}>
            {e.etat_lisible}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Sending health: what left, what arrived, and which addresses keep failing. */
function SanteEnvois({ token }: { token: string }): JSX.Element {
  const res = useResource(() => getSanteEmail(token), [token], 60000);
  if (res.loading) return <p className="muted">Chargement...</p>;
  if (res.error) return <p className="banner banner-error">{res.error}</p>;
  const s = res.data;
  if (!s) return <></>;
  const libelle: Record<string, string> = {
    delivre: "Livrés",
    ouvert: "Ouverts",
    envoye: "Partis, livraison non confirmée",
    en_cours: "En cours",
    rebondi: "Rejetés par la boîte",
    rejete: "Refusés par le fournisseur",
    echoue: "Échecs d'envoi",
  };
  return (
    <section className="card">
      <h2>Santé des envois, {s.periode}</h2>
      <div className="kpi-grid">
        <div className="kpi">
          <span className="kpi-value">{s.total_envois}</span>
          <span className="kpi-label">Messages enregistrés</span>
        </div>
        {Object.entries(s.par_statut).map(([k, v]) => (
          <div className="kpi" key={k}>
            <span className="kpi-value">{v}</span>
            <span className="kpi-label">{libelle[k] ?? k}</span>
          </div>
        ))}
      </div>
      {s.adresses_en_echec.length > 0 ? (
        <>
          <p className="section-title">Adresses qui échouent de façon répétée</p>
          <p className="muted">
            Une adresse qui rejette systématiquement est une personne qui ne reçoit jamais rien. Vérifiez-la
            auprès du membre avant de relancer.
          </p>
          <ul className="list">
            {s.adresses_en_echec.map((a) => (
              <li key={a.adresse} className="list-row">
                <div className="event-main">
                  <strong>{a.adresse}</strong>
                  <span className="muted">Dernier échec le {dateHeure(a.dernier)}</span>
                </div>
                <span className="badge badge-bad">
                  {a.echecs} {a.echecs > 1 ? "échecs" : "échec"}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="banner banner-ok">Aucune adresse en échec répété sur la période.</p>
      )}
    </section>
  );
}

/**
 * Registrations that never reached a usable account, with the reason for each and
 * the one action that unblocks them.
 *
 * People registered and heard nothing back, while the journal recorded a success:
 * the provider had accepted the request, which is not the same as somebody
 * receiving a message. This screen reads the send ledger instead, states what is
 * blocking each person in a sentence, and lets an administrator resend, one by one
 * or in a batch that is always previewed before it fires.
 */
export function InscriptionsBloquees({ token }: { token: string }): JSX.Element {
  const [page, setPage] = useState(1);
  const [taille, setTaille] = useState(10);
  const [rechargement, setRechargement] = useState(0);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [apercu, setApercu] = useState<ReparationApercu | null>(null);
  const [resultat, setResultat] = useState<ReparationResultat | null>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charge = useCallback(
    () => getInscriptionsAReparer(token, page, taille),
    [token, page, taille, rechargement],
  );
  const res = useResource(charge, [token, page, taille, rechargement]);
  const data = res.data;
  const items: InscriptionBloquee[] = data?.items ?? [];

  function bascule(id: string): void {
    setSelection((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
    setApercu(null);
    setResultat(null);
  }

  function toutSelectionner(): void {
    const tous = items.filter((i) => i.email).map((i) => i.membre_id);
    setSelection((s) => (tous.every((id) => s.has(id)) ? new Set() : new Set(tous)));
    setApercu(null);
    setResultat(null);
  }

  async function preparer(): Promise<void> {
    setBusy(true);
    setErreur(null);
    setResultat(null);
    try {
      const r = (await reparerInscriptions(token, [...selection], true)) as ReparationApercu;
      setApercu(r);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Aperçu impossible");
    } finally {
      setBusy(false);
    }
  }

  async function envoyer(): Promise<void> {
    setBusy(true);
    setErreur(null);
    try {
      const r = (await reparerInscriptions(token, [...selection], false)) as ReparationResultat;
      setResultat(r);
      setApercu(null);
      setSelection(new Set());
      setRechargement((v) => v + 1);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  }

  const resume = data?.resume ?? {};

  return (
    <>
      <SanteEnvois token={token} />

      <section className="card">
        <h2>Inscriptions bloquées</h2>
        <p className="muted">
          Chaque personne dont l&apos;inscription n&apos;a pas abouti à un accès utilisable, avec ce qui la
          bloque et ce qu&apos;il faut faire. Le diagnostic lit le registre des envois, pas seulement le
          journal d&apos;action.
        </p>

        <div className="chips">
          {(["bloquant", "attention", "information"] as const).map((g) =>
            resume[g] ? (
              <span key={g} className={`badge ${GRAVITE_CLASSE[g]}`}>
                {resume[g]} {(GRAVITE_LIBELLE[g] ?? g).toLowerCase()}
              </span>
            ) : null,
          )}
          {data && !data.resume_complet && (
            <span className="muted">Décompte partiel, au-delà du plafond d&apos;analyse.</span>
          )}
        </div>

        {res.loading && <p className="muted">Chargement...</p>}
        {res.error && <p className="banner banner-error">{res.error}</p>}
        {erreur && <p className="banner banner-error">{erreur}</p>}

        {!res.loading && items.length === 0 && (
          <p className="banner banner-ok">Aucune inscription bloquée. Toutes ont abouti à un accès utilisable.</p>
        )}

        {items.length > 0 && (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Tout sélectionner sur cette page"
                        checked={items.filter((i) => i.email).every((i) => selection.has(i.membre_id)) && selection.size > 0}
                        onChange={toutSelectionner}
                      />
                    </th>
                    <th>Membre</th>
                    <th>Inscrit le</th>
                    <th>Dernier envoi</th>
                    <th>Ce qui bloque</th>
                    <th>Action</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.membre_id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner ${i.nom ?? i.email ?? i.membre_id}`}
                          disabled={!i.email}
                          checked={selection.has(i.membre_id)}
                          onChange={() => bascule(i.membre_id)}
                        />
                      </td>
                      <td>
                        <strong>{i.nom ?? "Nom non renseigné"}</strong>
                        <br />
                        <span className="muted">
                          {i.email ?? "adresse absente"}
                          {i.matricule ? ` · ${i.matricule}` : ""}
                        </span>
                      </td>
                      <td>{date(i.inscrit_le)}</td>
                      <td>
                        {i.etat_envoi}
                        {i.dernier_envoi_le && (
                          <>
                            <br />
                            <span className="muted">{dateHeure(i.dernier_envoi_le)}</span>
                          </>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${GRAVITE_CLASSE[i.gravite]}`}>{GRAVITE_LIBELLE[i.gravite]}</span>
                        <br />
                        <span className="muted">{i.cause}</span>
                      </td>
                      <td className="muted">{i.action}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-inline"
                          onClick={() => setOuvert(ouvert === i.membre_id ? null : i.membre_id)}
                        >
                          {ouvert === i.membre_id ? "Masquer" : "Historique"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {ouvert && (
              <section className="card">
                <h3>Historique des envois</h3>
                <HistoriqueEnvois token={token} membreId={ouvert} />
              </section>
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
                libelle="inscriptions"
              />
            )}

            {selection.size > 0 && (
              <div className="form-actions">
                <span>
                  {selection.size} {selection.size > 1 ? "membres sélectionnés" : "membre sélectionné"}
                </span>
                <button type="button" className="btn" disabled={busy} onClick={() => void preparer()}>
                  Préparer le renvoi
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setSelection(new Set())}>
                  Annuler la sélection
                </button>
              </div>
            )}

            {apercu && (
              <section className="card">
                <h3>Avant d&apos;envoyer</h3>
                <p className="muted">
                  {apercu.total} {apercu.total > 1 ? "personnes recevront" : "personne recevra"} un nouvel accès.
                  Ce qui est affiché ici est exactement ce qui sera envoyé.
                </p>
                <ul className="list">
                  {apercu.destinataires.map((d) => (
                    <li key={d.membre_id} className="list-row">
                      <div className="event-main">
                        <strong>{d.nom ?? d.email}</strong>
                        <span className="muted">
                          {d.email}
                          {d.matricule ? ` · ${d.matricule}` : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                {apercu.ecartes.length > 0 && (
                  <p className="banner banner-error">
                    {apercu.ecartes.length} {apercu.ecartes.length > 1 ? "membres écartés" : "membre écarté"} :
                    adresse absente ou invalide. Corrigez l&apos;adresse avant de relancer.
                  </p>
                )}
                <div className="form-actions">
                  <button type="button" className="btn btn-primary" disabled={busy || apercu.total === 0} onClick={() => void envoyer()}>
                    {busy ? "Envoi en cours..." : `Envoyer à ${apercu.total}`}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setApercu(null)}>
                    Revenir
                  </button>
                </div>
              </section>
            )}

            {resultat && (
              <section className="card">
                <h3>Résultat du renvoi</h3>
                <p className={resultat.envoyes === resultat.traites ? "banner banner-ok" : "banner banner-error"}>
                  {resultat.envoyes} sur {resultat.traites} {resultat.traites > 1 ? "envois ont abouti" : "envoi a abouti"}.
                </p>
                <ul className="list">
                  {resultat.resultats.map((r) => (
                    <li key={r.membre_id} className="list-row">
                      <div className="event-main">
                        <strong>{r.email ?? r.membre_id}</strong>
                        {r.erreur && <span className="muted">{r.erreur}</span>}
                      </div>
                      <span className={`badge ${r.envoye ? "badge-ok" : "badge-bad"}`}>
                        {r.envoye ? `Parti (${r.canal ?? "canal inconnu"})` : "Non parti"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </section>
    </>
  );
}
