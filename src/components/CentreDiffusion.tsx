import { useEffect, useState } from "react";

import { type CentreDiffusion as Centre, getCentreDiffusion } from "../api.js";

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

/**
 * Communication > Centre de diffusion.
 *
 * A read-only overview of the Informations state (active, expiring, drafts,
 * scheduled, archived), their reading rate, the relay channels and the last
 * retention run, plus guardrail hints (informations expiring within 48h, open
 * delivery failures). The publish guardrails themselves (mandatory duration, etc.)
 * live in the editor and the API.
 */
export function CentreDiffusion({ token }: Readonly<{ token: string }>): JSX.Element {
  const [d, setD] = useState<Centre | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void getCentreDiffusion(token).then(setD).catch((e) => setErr(String(e?.message ?? e)));
  }, [token]);

  if (!d) {
    return (
      <div className="page">
        <header className="page-head"><h1>Centre de diffusion</h1></header>
        <section className="card"><p className="muted">{err ?? "Chargement..."}</p></section>
      </div>
    );
  }

  const cartes: { label: string; valeur: string | number; ton?: string }[] = [
    { label: "Informations actives", valeur: d.informations_actives },
    { label: "Expirent sous 48 h", valeur: d.informations_expirant_48h, ton: d.informations_expirant_48h > 0 ? "warn" : undefined },
    { label: "Brouillons", valeur: d.informations_brouillons },
    { label: "Programmées", valeur: d.informations_programmees },
    { label: "Archivées", valeur: d.informations_archivees },
    { label: "Taux de lecture (90 j)", valeur: `${d.taux_lecture} %` },
    { label: "Non lues (actives)", valeur: d.informations_non_lues },
    { label: "Relais Telegram (30 j)", valeur: d.telegram_relais_30j },
    { label: "Échecs d'envoi ouverts", valeur: d.echecs_envoi, ton: d.echecs_envoi > 0 ? "danger" : undefined },
  ];

  return (
    <div className="page">
      <header className="page-head">
        <h1>Centre de diffusion</h1>
        <p className="muted">Vue d'ensemble des Informations, de leur lecture et des canaux de diffusion.</p>
      </header>
      {err && <div className="banner-error">{err}</div>}

      <section className="card">
        <div className="cd-grid">
          {cartes.map((c) => (
            <div key={c.label} className={`cd-tile ${c.ton ? `cd-${c.ton}` : ""}`}>
              <b>{c.valeur}</b>
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Informations expirant bientôt (48 h)</h2>
        {d.expirant_bientot.length === 0 ? (
          <p className="muted">Aucune information n'expire dans les 48 heures.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Titre</th><th>Priorité</th><th>Expire le</th></tr></thead>
              <tbody>
                {d.expirant_bientot.map((i) => (
                  <tr key={i.id}>
                    <td>{i.titre}</td>
                    <td><span className={`tag tag-${i.priorite}`}>{i.priorite}</span></td>
                    <td>{fmtDate(i.expire_le)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Garde-fous</h2>
        <ul className="muted small" style={{ margin: 0, paddingLeft: 18 }}>
          <li>Une Information ne peut pas être publiée sans durée d'affichage.</li>
          <li>Un titre est obligatoire, et au moins un destinataire est requis.</li>
          <li>L'application membre est toujours la source officielle; Telegram et e-mail relaient avec un lien vers ADSUM.</li>
          <li>La suppression définitive des Informations et notifications reste désactivée par défaut (voir Rétention et archivage).</li>
        </ul>
        {d.derniere_retention && (
          <p className="muted small" style={{ marginTop: 8 }}>Dernière exécution de rétention: {fmtDate(d.derniere_retention.execute_le)}. {d.derniere_retention.rapport}</p>
        )}
      </section>
    </div>
  );
}
