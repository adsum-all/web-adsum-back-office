import { getAudit } from "../api.js";
import { formatDate } from "../format.js";
import { useResource } from "../useResource.js";
import { usePagination } from "../usePagination.js";
import { Pagination } from "./Pagination.js";

const ACTION_LABELS: Record<string, string> = {
  creation_membre: "Creation membre",
  modification_membre: "Modification membre",
  validation_identite: "Validation identite",
  creation_compte: "Creation compte",
  modification_compte: "Modification compte",
  enregistrement_terminal: "Enregistrement terminal",
  autorisation_terminal: "Autorisation terminal",
  revocation_terminal: "Revocation terminal",
};

export function JournalAudit({ token }: { token: string }): JSX.Element {
  const { data, loading, error } = useResource(() => getAudit(token), [token]);

  const pagination = usePagination((data ?? []), 20);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Journal d'audit</h1>
          <p className="muted">
            Toute action sensible est tracee : creations, modifications, validations, revocations.
          </p>
        </div>
      </header>

      {error && <p className="banner banner-error">{error}</p>}

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Acteur</th>
              <th>Action</th>
              <th>Objet</th>
              <th>Horodatage</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="muted">Chargement...</td>
              </tr>
            )}
            {pagination.page.map((e) => (
              <tr key={e.id}>
                <td>
                  <div className="event-main">
                    <strong>{e.acteur_nom ?? e.acteur_role ?? "-"}</strong>
                    <span className="muted small">{e.acteur_role ?? ""}</span>
                  </div>
                </td>
                <td>{ACTION_LABELS[e.action] ?? e.action}</td>
                <td className="mono small">{e.objet_type ?? "-"}{e.objet_id ? ` ${e.objet_id.slice(0, 8)}` : ""}</td>
                <td>{e.horodatage ? formatDate(e.horodatage) : "-"}</td>
              </tr>
            ))}
            {!loading && (data ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="muted">Aucune action tracee pour le moment.</td>
              </tr>
            )}
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
        libelle="entrées"
      />
      <p className="muted small">Lecture restreinte (super-admin, admin). Append-only.</p>
    </div>
  );
}
