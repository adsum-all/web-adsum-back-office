import { useState } from "react";

import { ApiError, type ApplicationAcces, getMembreApplications, setMembreApplication } from "../api.js";
import { useResource } from "../useResource.js";

/**
 * LEVEL 1 governance for a single member: which applications they can see and open.
 * Granting access makes the application appear in the member's « Mes applications »;
 * revoking removes it immediately on their next load. This does NOT grant roles or data
 * inside the application (those are the RBAC roles and perimeters, governed elsewhere).
 * Every grant/revoke is audited server-side.
 */
export function MembreApplications({ token, membreId, canAccesAdmin = false }: { token: string; membreId: string; canAccesAdmin?: boolean }): JSX.Element {
  // Both the GET and the PUT require acces.administrer. Without it, skip the fetch
  // entirely (no silent 403) and present the panel read-only.
  const apps = useResource(
    () => (canAccesAdmin ? getMembreApplications(token, membreId) : Promise.resolve([] as ApplicationAcces[])),
    [token, membreId, canAccesAdmin],
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function basculer(a: ApplicationAcces): void {
    setBusy(a.code); setError(null); setNote(null);
    setMembreApplication(token, membreId, a.code, !a.acces_actif)
      .then(() => { setNote(a.acces_actif ? `Accès à ${a.nom} révoqué.` : `Accès à ${a.nom} accordé.`); apps.reload(); })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Erreur réseau"))
      .finally(() => setBusy(null));
  }

  function libelleBascule(a: ApplicationAcces): string {
    if (busy === a.code) return "...";
    return a.acces_actif ? "Révoquer" : "Accorder";
  }

  return (
    <section className="card">
      <h2 className="card-title">Accès aux applications</h2>
      <p className="muted small">
        Contrôle ce que le membre voit dans « Mes applications ». Accorder rend l'application visible et ouvrable par le
        membre. Cela ne donne ni les rôles ni les données internes de l'application, qui restent régis par les rôles et
        les périmètres. Chaque changement est journalisé.
      </p>
      {!canAccesAdmin ? (
        <p className="banner banner-info small">
          Réservé à l'administration des accès. La consultation et la modification des accès applicatifs d'un membre
          requièrent la permission <span className="mono">acces.administrer</span>.
        </p>
      ) : (
        <>
          {error && <p className="banner banner-error">{error}</p>}
          {note && <p className="banner banner-ok">{note}</p>}
          {apps.error && <p className="banner banner-error">{apps.error}</p>}
          <ul className="list">
            {(apps.data ?? []).map((a) => (
              <li key={a.code} className="list-row" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ flex: 1, minWidth: 180 }}>
                  <strong>{a.nom}</strong>
                  {a.description && <span className="muted small" style={{ display: "block" }}>{a.description}</span>}
                </span>
                {!a.actif ? (
                  // A deactivated application is listed so a surviving grant stays
                  // reviewable, but it cannot be toggled (the server refuses it).
                  <>
                    <span className="badge badge-warn">Application désactivée</span>
                    <span className="badge badge-mut">{a.acces_actif ? "Octroi conservé" : "Pas d'accès"}</span>
                  </>
                ) : a.est_defaut ? (
                  // The member space is visible to every member automatically: there is
                  // nothing to grant or revoke here (the server refuses it with a 409).
                  <>
                    <span className="badge badge-ok" title="Visibilité automatique pour tous les membres">Visible par défaut</span>
                    <span className="muted small">non révocable</span>
                  </>
                ) : (
                  <>
                    <span className={`badge ${a.acces_actif ? "badge-ok" : "badge-mut"}`}>{a.acces_actif ? "Accès actif" : "Pas d'accès"}</span>
                    <button
                      type="button"
                      className={`btn btn-inline ${a.acces_actif ? "btn-danger" : "btn-primary"}`}
                      disabled={busy !== null}
                      onClick={() => basculer(a)}
                    >
                      {libelleBascule(a)}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          {!apps.loading && (apps.data ?? []).length === 0 && <p className="muted">Aucune application au catalogue.</p>}
        </>
      )}
    </section>
  );
}
