import { Fragment, useState } from "react";

import {
  ApiError,
  createTechnicalAdmin,
  deleteTechnicalAdminDefinitif,
  getTechnicalAdmins,
  grantTechnicalAdmin,
  revokeTechnicalAdmin,
  setTechnicalAdminActivation,
  setTechnicalAdminNiveau,
} from "../api.js";
import { useResource } from "../useResource.js";
import { usePagination } from "../usePagination.js";
import { Pagination } from "./Pagination.js";

const NIVEAU_LABEL: Record<string, string> = {
  lecteur: "Lecteur",
  developpeur: "Développeur",
  mainteneur: "Mainteneur",
  admin: "Administrateur",
  super: "Super administrateur",
};

/**
 * System page reserved to technical (support) super-admins, of a managing level (admin
 * or super). It gives full visibility on the technical roster and drives the whole
 * lifecycle inline, with no pop-up: create by e-mail, change level, activate/deactivate,
 * and remove (revoke, or definitive delete for a never-used account). The server enforces
 * every guard: the level gate, self-protection, the last-active-support rule, and audit
 * immutability (a used account keeps its trail and can only be revoked, never deleted).
 */
export function TechnicalAdmins({ token }: { token: string }): JSX.Element {
  const data = useResource(() => getTechnicalAdmins(token), [token]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [nouvelEmail, setNouvelEmail] = useState("");
  const [nouveauNiveau, setNouveauNiveau] = useState("admin");
  const [retraitId, setRetraitId] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, message: string): Promise<boolean> {
    setBusy(true); setError(null); setNote(null);
    try {
      await action();
      setNote(message);
      data.reload();
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const d = data.data;
  const niveaux = d?.niveaux ?? ["lecteur", "developpeur", "mainteneur", "admin", "super"];
  const peutGerer = d?.peut_gerer ?? false;
  const estSuper = d?.mon_niveau === "super";
  const actifs = d?.techniques_actifs ?? 0;

  const pagination = usePagination(d?.techniques ?? [], 10);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Super-admins applicatifs techniques</h1>
          <p className="muted">
            Identités techniques de support : accès total à toutes les applications et à tout le contenu, sans
            appartenance. Distinct d'un super-admin membre (limité à ses accès). Tout se gère ici, jamais ailleurs.
          </p>
        </div>
      </header>

      <div className="banner banner-info small">
        Mode super-admin technique : accès global exceptionnel, réservé au support, à la maintenance et aux incidents.
        Toutes les actions sont journalisées dans le <strong>Journal d'audit</strong>. À n'utiliser que pour résoudre un
        problème, jamais pour le travail courant.
        {d && <> Votre niveau : <strong>{NIVEAU_LABEL[d.mon_niveau ?? ""] ?? "-"}</strong>.</>}
      </div>

      <div className="banner small" style={{ background: "var(--adsum-panel)", border: "1px solid var(--adsum-line)" }}>
        <strong>Qu'est-ce que l'audit ?</strong> C'est le journal <strong>immuable</strong> de toutes les actions (page
        « Journal d'audit »). Dès qu'un compte s'est connecté ou a agi, il y laisse une trace inaltérable. Pour préserver
        la traçabilité (HDS/RGPD), un compte qui a un historique d'audit <strong>ne peut plus être supprimé</strong> : on
        le <strong>révoque</strong> (il perd tout accès), l'historique restant intact. Seul un compte jamais utilisé peut
        être supprimé définitivement.
      </div>

      {peutGerer && actifs <= 1 && (
        <div className="banner banner-warn small">
          <strong>Un seul compte technique actif.</strong> L'application en dépend en permanence. Vous ne pouvez ni le
          désactiver, ni le révoquer, ni le supprimer tant qu'un remplaçant n'a pas été <strong>créé puis activé</strong>.
          Ajoutez un remplaçant ci-dessous, activez-le, puis retirez l'ancien.
        </div>
      )}

      {data.error && <p className="banner banner-error">{data.error}</p>}
      {error && <p className="banner banner-error">{error}</p>}
      {note && <p className="banner banner-ok">{note}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th>Compte technique</th><th>Niveau</th><th>Actif</th><th>2FA</th><th>Audit</th><th>Dernière connexion</th><th /></tr>
          </thead>
          <tbody>
            {data.loading && <tr><td colSpan={7} className="muted">Chargement...</td></tr>}
            {!data.loading && (d?.techniques.length ?? 0) === 0 && (
              <tr><td colSpan={7} className="muted">Aucun super-admin technique.</td></tr>
            )}
            {pagination.page.map((a) => {
              const estMoi = d?.mon_id === a.id;
              const estDernierActif = a.actif && actifs <= 1;
              const verrou = estDernierActif
                ? "Dernier compte technique actif : créez et activez un remplaçant d'abord."
                : estMoi ? "Vous ne pouvez pas agir sur votre propre compte." : "";
              return (
                <Fragment key={a.id}>
                  <tr>
                    <td>{a.email}</td>
                    <td>
                      {peutGerer ? (
                        <select
                          className="search"
                          style={{ minWidth: 150 }}
                          value={a.niveau}
                          disabled={busy}
                          onChange={(e) => void run(() => setTechnicalAdminNiveau(token, a.id, e.target.value), "Niveau mis à jour.")}
                        >
                          {niveaux.map((n) => <option key={n} value={n}>{NIVEAU_LABEL[n] ?? n}</option>)}
                        </select>
                      ) : (
                        <span className="badge badge-mut">{NIVEAU_LABEL[a.niveau] ?? a.niveau}</span>
                      )}
                    </td>
                    <td><span className={`badge ${a.actif ? "badge-ok" : "badge-mut"}`}>{a.actif ? "Actif" : "Inactif"}</span></td>
                    <td>
                      <span className="badge badge-ok" title="2FA imposée à chaque connexion ; appareil de confiance re-vérifié toutes les 72 h">Imposée (72h)</span>
                      {!a.mfa_actif && <span className="muted small" style={{ display: "block", marginTop: 2 }}>authentificateur non enrôlé</span>}
                    </td>
                    <td className="small">
                      {a.audit_count > 0
                        ? <span title="Actions journalisées, conservées de façon immuable">{a.audit_count} action(s)</span>
                        : <span className="muted">jamais utilisé</span>}
                    </td>
                    <td className="small">{a.dernier_login ? new Date(a.dernier_login).toLocaleString("fr-FR") : "-"}</td>
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {peutGerer && (
                        <button type="button" className="btn btn-ghost btn-inline" disabled={busy || estMoi || estDernierActif} title={verrou}
                          onClick={() => void run(() => setTechnicalAdminActivation(token, a.id, !a.actif), a.actif ? "Compte désactivé." : "Compte activé.")}>
                          {a.actif ? "Désactiver" : "Activer"}
                        </button>
                      )}
                      {peutGerer && (
                        <button type="button" className="btn btn-danger btn-inline" disabled={busy || estMoi || estDernierActif} title={verrou}
                          onClick={() => { setError(null); setNote(null); setRetraitId(retraitId === a.id ? null : a.id); }}>
                          Retirer
                        </button>
                      )}
                    </td>
                  </tr>
                  {retraitId === a.id && (
                    <tr>
                      <td colSpan={7} style={{ background: "var(--adsum-panel)" }}>
                        <div className="banner" style={{ textAlign: "left", background: "transparent", border: "1px solid var(--adsum-line)", display: "flex", flexDirection: "column", gap: 10 }}>
                          <strong>Retirer le compte {a.email}</strong>
                          {estDernierActif ? (
                            <span className="small">C'est le seul compte technique actif : créez et activez un remplaçant d'abord.</span>
                          ) : (
                            <>
                              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                <button type="button" className="btn btn-primary btn-inline" disabled={busy}
                                  onClick={() => void run(() => revokeTechnicalAdmin(token, a.id), "Accès technique révoqué. L'historique d'audit reste intact.").then((ok) => { if (ok) setRetraitId(null); })}>
                                  Révoquer l'accès technique
                                </button>
                                <span className="muted small">Recommandé : le compte perd tout accès technique. Son historique d'audit ({a.audit_count} action(s)) est conservé.</span>
                              </div>
                              {estSuper && !a.actif ? (
                                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                                  <button type="button" className="btn btn-inline" style={{ background: "var(--adsum-danger)", color: "#fff" }} disabled={busy}
                                    onClick={() => void run(() => deleteTechnicalAdminDefinitif(token, a.id), "Compte supprimé définitivement (adresse retirée, historique anonymisé).").then((ok) => { if (ok) setRetraitId(null); })}>
                                    Supprimer définitivement
                                  </button>
                                  <span className="muted small">
                                    Nettoyage profond, <strong>irréversible</strong> : l'adresse est retirée.
                                    {a.audit_count > 0 && <> Ses {a.audit_count} action(s) restent dans l'audit mais sont <strong>anonymisées</strong> (plus rattachées à personne).</>}
                                  </span>
                                </div>
                              ) : (
                                estSuper && <span className="small muted">Pour supprimer définitivement, désactivez d'abord ce compte.</span>
                              )}
                              <button type="button" className="btn btn-ghost btn-inline" style={{ alignSelf: "flex-start" }} onClick={() => setRetraitId(null)}>Annuler</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pagination
        page={pagination.numero}
        pages={pagination.pages}
        total={pagination.total}
        taille={pagination.taille}
        onPage={pagination.setNumero}
        onTaille={pagination.setTaille}
        libelle="comptes techniques"
      />

      {peutGerer && (
      <section className="card" style={{ marginTop: 18 }}>
        <h2 className="card-title">Ajouter un utilisateur applicatif technique</h2>
        <p className="muted small">
          Saisissez l'adresse d'un <strong>nouveau compte applicatif</strong> dédié. Un membre n'est jamais promu ici :
          le compte n'est pas un membre, n'a pas de matricule membre, et n'apparaît jamais dans l'annuaire. Il est
          <strong> validé d'office</strong> (aucune file de validation ailleurs), avec double authentification imposée.
          Créé inactif (pas de mot de passe temporaire) : le titulaire définit son mot de passe via la réinitialisation.
          Pour qu'il serve, notamment comme <strong>remplaçant</strong>, activez-le ensuite ici.
        </p>
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault();
            const email = nouvelEmail.trim();
            if (email) void run(() => createTechnicalAdmin(token, email, nouveauNiveau), "Compte technique créé (inactif, en attente de première connexion).").then((ok) => { if (ok) setNouvelEmail(""); });
          }}
        >
          <input className="search" type="email" placeholder="adresse@professionnelle" value={nouvelEmail} onChange={(e) => setNouvelEmail(e.target.value)} />
          <select className="search" value={nouveauNiveau} onChange={(e) => setNouveauNiveau(e.target.value)} aria-label="Niveau du compte">
            {niveaux.filter((n) => n !== "super" || estSuper).map((n) => <option key={n} value={n}>{NIVEAU_LABEL[n] ?? n}</option>)}
          </select>
          <button type="submit" className="btn btn-primary btn-inline" disabled={busy || !nouvelEmail.trim()}>Créer le compte technique</button>
        </form>
        {(d?.candidats.length ?? 0) > 0 && (
          <>
            <p className="muted small" style={{ marginTop: 12 }}>
              Comptes applicatifs existants (non membres), par exemple des comptes révoqués : vous pouvez les
              <strong> promouvoir</strong> à nouveau, ou les <strong>supprimer définitivement</strong> (nettoyage profond, adresse retirée).
            </p>
            <ul className="list">
              {(d?.candidats ?? []).map((c) => (
                <li key={c.id} className="list-row" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ flex: 1 }}>{c.email}</span>
                  <button type="button" className="btn btn-primary btn-inline" disabled={busy}
                    onClick={() => void run(() => grantTechnicalAdmin(token, c.id), "Accès technique accordé.")}>
                    Promouvoir
                  </button>
                  {estSuper && (
                    <button type="button" className="btn btn-danger btn-inline" disabled={busy}
                      onClick={() => void run(() => deleteTechnicalAdminDefinitif(token, c.id), "Compte supprimé définitivement (adresse retirée, historique anonymisé).")}>
                      Supprimer définitivement
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      )}
    </div>
  );
}
