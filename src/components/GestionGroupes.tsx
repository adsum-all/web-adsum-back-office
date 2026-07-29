import { useMemo, useState } from "react";

import {
  ApiError,
  type GroupeAcces,
  deleteGroupe,
  getApplications,
  getCataloguePermissions,
  getGroupes,
  updateGroupe,
} from "../api.js";
import { useResource } from "../useResource.js";
import { GroupeDupliquer } from "./GroupeDupliquer.js";
import { GroupeFiche } from "./GroupeFiche.js";
import { GroupeForm } from "./GroupeForm.js";
import { roleLabel } from "./utilisateursShared.js";
import { usePagination } from "../usePagination.js";
import { Pagination } from "./Pagination.js";

/** Which slice of groups this instance manages: every group, only the custom
 * (editable) ones, or only the system (read-only reference) ones. */
export type PorteeGroupes = "toutes" | "modifiables" | "standard";

const PORTEE_META: Record<PorteeGroupes, { titre: string; intro: string }> = {
  toutes: {
    titre: "Groupes d'accès",
    intro:
      "Chaque groupe accorde soit un rôle plateforme, soit un jeu de permissions précises. Refus par défaut : un membre sans groupe n'a aucun accès. Les groupes système ne sont pas modifiables.",
  },
  modifiables: {
    titre: "Groupes modifiables",
    intro:
      "Groupes créés sur mesure : vous pouvez les créer, éditer, activer ou désactiver et supprimer. Chacun accorde un rôle plateforme ou un jeu de permissions précises, et peut viser une application.",
  },
  standard: {
    titre: "Groupes standard (système)",
    intro:
      "Groupes fournis par la plateforme, en lecture seule. Ils servent de référence et ne sont jamais modifiables ni supprimables. Pour un besoin particulier, créez un groupe modifiable.",
  },
};

/**
 * Access groups listing: browse, search and (for custom groups) fully manage
 * them. The superadmin can create (role or permission groups), edit,
 * activate/deactivate and delete a custom group. System groups are read-only.
 * The `portee` prop restricts the list to editable groups, system groups, or both.
 * Every action goes through the server, which enforces least privilege and audits.
 */
export function GestionGroupes({
  token,
  canSysteme = false,
  portee = "toutes",
}: {
  token: string;
  canSysteme?: boolean;
  portee?: PorteeGroupes;
}): JSX.Element {
  const groupes = useResource(() => getGroupes(token, true), [token]);
  const catalogue = useResource(() => getCataloguePermissions(token), [token]);
  const applications = useResource(() => getApplications(token), [token]);
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<"tous" | "role" | "permissions">("tous");
  // Per-application view: "toutes" shows everything, "aucune" the untagged
  // (cross-application) groups, otherwise an application code.
  const [appFiltre, setAppFiltre] = useState<string>("toutes");
  const [creer, setCreer] = useState(false);
  const [edit, setEdit] = useState<GroupeAcces | null>(null);
  // Reading a group and copying a protected one are the two paths that make the
  // standard groups usable: neither existed, so a standard group could only be looked at.
  const [fiche, setFiche] = useState<string | null>(null);
  const [dupliquer, setDupliquer] = useState<GroupeAcces | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // A system group is never editable; the "standard" view is read-only by design.
  const gerable = canSysteme && portee !== "standard";
  const meta = PORTEE_META[portee];

  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (groupes.data ?? [])
      .filter((g) => (portee === "toutes" ? true : portee === "standard" ? g.systeme : !g.systeme))
      .filter((g) => (filtre === "tous" ? true : g.mode === filtre))
      .filter((g) =>
        appFiltre === "toutes" ? true : appFiltre === "aucune" ? !g.application_code : g.application_code === appFiltre)
      .filter((g) => !term || g.libelle.toLowerCase().includes(term) || g.cle.toLowerCase().includes(term));
  }, [groupes.data, q, filtre, appFiltre, portee]);

  const nomApplication = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of applications.data ?? []) map.set(a.code, a.nom.replace(/^ADSUM\s+/i, ""));
    return map;
  }, [applications.data]);

  async function run(id: string, action: () => Promise<unknown>): Promise<void> {
    setBusy(id);
    setError(null);
    try {
      await action();
      groupes.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(null);
    }
  }

  function afterForm(): void {
    setCreer(false);
    setEdit(null);
    groupes.reload();
  }

  const pagination = usePagination(items, 10);

  return (
    <div>
      <header className="page-head">
        <div>
          <h2 className="section-title">{meta.titre}</h2>
          <p className="muted small">{meta.intro}</p>
        </div>
        {gerable ? (
          catalogue.data && (
            <button type="button" className="btn btn-primary btn-inline" onClick={() => { setCreer(true); setEdit(null); }}>
              + Nouveau groupe
            </button>
          )
        ) : (
          <span className="muted small">Lecture seule</span>
        )}
      </header>

      {error && <p className="banner banner-error">{error}</p>}
      {groupes.error && <p className="banner banner-error">{groupes.error}</p>}

      {!canSysteme && portee !== "standard" && (
        <p className="banner banner-info small">
          Vous consultez les groupes d'accès en lecture seule. La gestion requiert la permission
          <span className="mono"> acces.systeme</span>.
        </p>
      )}

      {gerable && (creer || edit) && catalogue.data && (
        <GroupeForm
          token={token}
          catalogue={catalogue.data}
          existing={edit ?? undefined}
          onDone={afterForm}
          onCancel={() => { setCreer(false); setEdit(null); }}
        />
      )}

      <div className="form-inline" style={{ margin: "12px 0" }}>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un groupe" />
        <select value={appFiltre} onChange={(e) => setAppFiltre(e.target.value)} aria-label="Filtrer par application">
          <option value="toutes">Toutes les applications</option>
          {(applications.data ?? []).map((a) => (
            <option key={a.code} value={a.code}>{a.nom.replace(/^ADSUM\s+/i, "")}</option>
          ))}
          <option value="aucune">Sans application (transverse)</option>
        </select>
        <select value={filtre} onChange={(e) => setFiltre(e.target.value as "tous" | "role" | "permissions")}>
          <option value="tous">Tous les types</option>
          <option value="role">Groupes de rôle</option>
          <option value="permissions">Groupes de permissions</option>
        </select>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Groupe</th>
              <th>Accorde</th>
              <th>Membres</th>
              <th>État</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {groupes.loading && <tr><td colSpan={5} className="muted">Chargement...</td></tr>}
            {!groupes.loading && items.length === 0 && <tr><td colSpan={5} className="muted">Aucun groupe.</td></tr>}
            {pagination.page.map((g) => (
              <tr key={g.id} style={{ opacity: g.actif ? 1 : 0.55 }}>
                <td>
                  <div className="event-main">
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <strong>{g.libelle}</strong>
                      {g.application_code && (
                        <span className="badge badge-mut">{nomApplication.get(g.application_code) ?? g.application_code}</span>
                      )}
                    </span>
                    <span className="mono muted small">{g.cle}{g.systeme ? " (système)" : ""}</span>
                    {g.description && <span className="muted small">{g.description}</span>}
                  </div>
                </td>
                <td>
                  {g.mode === "permissions" ? (
                    <span className="badge badge-ok" title={g.permissions.join(", ")}>
                      {g.permissions.length} permission{g.permissions.length > 1 ? "s" : ""}
                    </span>
                  ) : (
                    <span className="badge badge-ok">rôle : {roleLabel(g.role_accorde)}</span>
                  )}
                </td>
                <td className="muted small">{g.membres_count}</td>
                <td>
                  <span className={`badge ${g.actif ? "badge-ok" : "badge-mut"}`}>{g.actif ? "Actif" : "Désactivé"}</span>
                </td>
                <td>
                  <button type="button" className="link" onClick={() => setFiche(g.id)}>Consulter</button>
                  {g.systeme ? (
                    canSysteme ? (
                      <button type="button" className="link" onClick={() => setDupliquer(g)}>Dupliquer</button>
                    ) : (
                      <span className="muted small">non modifiable</span>
                    )
                  ) : !gerable ? (
                    <span className="muted small">Lecture seule</span>
                  ) : (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                      <button type="button" className="link" onClick={() => { setEdit(g); setCreer(false); }}>Modifier</button>
                      <button
                        type="button"
                        className="link"
                        disabled={busy === g.id}
                        onClick={() => void run(g.id, () => updateGroupe(token, g.id, { actif: !g.actif }))}
                      >
                        {g.actif ? "Désactiver" : "Réactiver"}
                      </button>
                      <button
                        type="button"
                        className="link"
                        disabled={busy === g.id || g.membres_count > 0}
                        title={g.membres_count > 0 ? "Retirez d'abord les membres" : "Supprimer"}
                        onClick={() => void run(g.id, () => deleteGroupe(token, g.id))}
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </td>
              </tr>
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
        libelle="groupes"
      />

      {fiche ? (
        <GroupeFiche
          token={token}
          groupeId={fiche}
          onClose={() => setFiche(null)}
          onDupliquer={canSysteme ? (f) => {
            setFiche(null);
            const source = (groupes.data ?? []).find((x) => x.id === f.identite.id);
            if (source) setDupliquer(source);
          } : undefined}
        />
      ) : null}

      {dupliquer ? (
        <GroupeDupliquer
          token={token}
          source={dupliquer}
          onClose={() => setDupliquer(null)}
          onDone={() => { setDupliquer(null); groupes.reload(); }}
        />
      ) : null}
    </div>
  );
}
