import { useState } from "react";

import { getAdresseRappelEmail } from "../api.js";
import { useResource } from "../useResource.js";

/**
 * The callback address the mail provider must call back on, ready to copy.
 *
 * Without it, the platform only ever learns that the provider accepted a request.
 * Whether the message then arrived, was opened, or was refused by the mailbox stays
 * invisible, which is how a registrant who received nothing looked, from inside the
 * application, exactly like one who received everything.
 *
 * The address is assembled server side because it carries the shared secret: typed
 * by hand, one wrong character means every call is refused, and the only symptom is
 * that bounces stay invisible, which is the very problem it exists to solve.
 */
export function RetourLivraison({ token }: { token: string }): JSX.Element {
  const res = useResource(() => getAdresseRappelEmail(token), [token]);
  const [copie, setCopie] = useState(false);
  const d = res.data;

  async function copier(): Promise<void> {
    if (!d?.adresse) return;
    try {
      await navigator.clipboard.writeText(d.adresse);
      setCopie(true);
      window.setTimeout(() => setCopie(false), 2500);
    } catch {
      setCopie(false);
    }
  }

  return (
    <section className="card">
      <h2 className="card-title">Retour de livraison des e-mails</h2>
      <p className="muted">
        Tant que le fournisseur ne rappelle pas la plateforme, un message rejeté ressemble en tout
        point à un message livré. Ce réglage est ce qui rend la différence visible.
      </p>

      {res.loading && <p className="muted">Chargement...</p>}
      {res.error && <p className="banner banner-error">{res.error}</p>}

      {d && !d.configuree && (
        <p className="banner banner-info">{d.message}</p>
      )}

      {d?.configuree && d.adresse && (
        <>
          <p className="muted">{d.message}</p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code
              className="mono"
              style={{ flex: "1 1 320px", minWidth: 0, overflowX: "auto", whiteSpace: "nowrap", padding: "8px 10px", border: "1px solid var(--adsum-line)", borderRadius: 8, background: "var(--adsum-bg)" }}
            >
              {d.adresse}
            </code>
            <button type="button" className="btn" onClick={() => void copier()}>
              {copie ? "Adresse copiée" : "Copier l'adresse"}
            </button>
          </div>
          <p className="muted small">
            Cette adresse contient la clé secrète. Ne la diffusez pas, et régénérez la clé
            ci-dessus si elle a circulé.
          </p>
          {d.evenements && d.evenements.length > 0 && (
            <p className="muted small">
              Événements à cocher chez le fournisseur : {d.evenements.join(", ")}.
            </p>
          )}
        </>
      )}
    </section>
  );
}
