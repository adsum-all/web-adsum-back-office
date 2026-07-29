import { useCallback, useMemo, useState } from "react";

import {
  type PermissionItem,
  getReferentielApplications,
  setPermissionApplications,
} from "../api.js";
import { usePagination } from "../usePagination.js";
import { useResource } from "../useResource.js";
import { Pagination } from "./Pagination.js";

/**
 * Which permission can be exercised from which application.
 *
 * An access group carries an application tag, and the tag was meant to bound the
 * right it grants to that one application. It bounded nothing, because nothing said
 * what a right means for a given application: Administration handed out inside the
 * collaboration workspace applied to the back office too. This grid is what the tag
 * reads to do its job.
 *
 * Changing a line widens or narrows what every group tagged for that application
 * confers, so the count of members concerned is shown next to each column: an
 * administrator moving a permission needs to know whether anybody is affected.
 */
export function PermissionsParApplication({
  token,
  permissions,
  domaines,
}: {
  token: string;
  permissions: PermissionItem[];
  domaines: string[];
}): JSX.Element {
  const [rechargement, setRechargement] = useState(0);
  const charge = useCallback(() => getReferentielApplications(token), [token, rechargement]);
  const res = useResource(charge, [token, rechargement]);
  const data = res.data;

  const [enCours, setEnCours] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  // Optimistic overlay, so a click answers immediately and reverts on refusal.
  const [local, setLocal] = useState<Record<string, string[]>>({});

  const parDomaine = useMemo(() => {
    const m = new Map<string, PermissionItem[]>();
    for (const p of permissions) {
      const liste = m.get(p.domaine) ?? [];
      liste.push(p);
      m.set(p.domaine, liste);
    }
    return m;
  }, [permissions]);

  const pagination = usePagination(domaines, 5);

  function applicationsDe(cle: string): string[] {
    return local[cle] ?? data?.par_permission[cle] ?? [];
  }

  async function basculer(cle: string, code: string, presente: boolean): Promise<void> {
    const avant = applicationsDe(cle);
    const apres = presente ? avant.filter((a) => a !== code) : [...avant, code];
    setLocal((l) => ({ ...l, [cle]: apres }));
    setEnCours(`${cle}:${code}`);
    setErreur(null);
    setNote(null);
    try {
      const r = await setPermissionApplications(token, cle, apres);
      setLocal((l) => ({ ...l, [cle]: r.applications }));
      setNote(
        presente
          ? `Permission retirée de ${code}. Les groupes étiquetés pour cette application ne l'accordent plus.`
          : `Permission ajoutée à ${code}. Les groupes étiquetés pour cette application l'accordent désormais.`,
      );
    } catch (e) {
      setLocal((l) => {
        const copie = { ...l };
        delete copie[cle];
        return copie;
      });
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setEnCours(null);
    }
  }

  if (res.loading) return <p className="muted">Chargement du référentiel...</p>;
  if (res.error) return <p className="banner banner-error">{res.error}</p>;
  if (!data) return <></>;

  const apps = data.applications.filter((a) => a.actif);

  return (
    <>
      <p className="muted">
        Un groupe d&apos;accès peut porter l&apos;étiquette d&apos;une application. Ce tableau dit ce que
        cette étiquette autorise réellement : un groupe étiqueté pour une application n&apos;accorde que
        les permissions cochées dans sa colonne. Le back-office conserve tout, puisqu&apos;il est la
        console d&apos;administration.
      </p>

      {note && <p className="banner banner-ok">{note}</p>}
      {erreur && <p className="banner banner-error">{erreur}</p>}

      <div className="table-wrap">
        <table className="table table-sticky">
          <thead>
            <tr>
              <th>Permission</th>
              {apps.map((a) => (
                <th key={a.code} style={{ textAlign: "center" }}>
                  {a.nom ?? a.code}
                  <br />
                  <span className="muted small">
                    {a.administre_tout
                      ? "administre tout"
                      : a.membres_concernes > 0
                        ? `${a.membres_concernes} ${a.membres_concernes > 1 ? "membres étiquetés" : "membre étiqueté"}`
                        : "aucun membre étiqueté"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagination.page.map((domaine) => (
              <>
                <tr key={`d-${domaine}`}>
                  <th colSpan={apps.length + 1} style={{ textAlign: "left" }}>
                    {domaine}
                  </th>
                </tr>
                {(parDomaine.get(domaine) ?? []).map((p) => {
                  const actuelles = applicationsDe(p.cle);
                  return (
                    <tr key={p.cle}>
                      <td>
                        <span className="mono">{p.cle}</span>
                        <br />
                        <span className="muted">{p.libelle}</span>
                      </td>
                      {apps.map((a) => {
                        const presente = actuelles.includes(a.code);
                        const fige = a.administre_tout;
                        const occupe = enCours === `${p.cle}:${a.code}`;
                        return (
                          <td key={a.code} style={{ textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={presente || fige}
                              disabled={fige || occupe}
                              aria-label={`${p.cle} dans ${a.nom ?? a.code}`}
                              title={
                                fige
                                  ? "Le back-office administre toutes les permissions"
                                  : presente
                                    ? "Retirer de cette application"
                                    : "Ajouter à cette application"
                              }
                              onChange={() => void basculer(p.cle, a.code, presente)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </>
            ))}
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
        libelle="domaines"
      />

      <p className="muted small">
        {data.total_couples} associations enregistrées. Un changement prend effet à la prochaine
        vérification de droits, sans reconnexion.
      </p>
      <button type="button" className="btn btn-ghost" onClick={() => setRechargement((v) => v + 1)}>
        Recharger le référentiel
      </button>
    </>
  );
}
