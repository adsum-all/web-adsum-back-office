const TAILLES = [5, 10, 20, 50, 100];

export interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  taille: number;
  onPage: (page: number) => void;
  /** Omit to hide the page-size selector, for lists whose size is imposed. */
  onTaille?: (taille: number) => void;
  /** What is being counted, for the accessible label ("membres", "informations"). */
  libelle?: string;
}

/**
 * Pagination shared by every long list: first, previous, next and last, the page
 * number, the page size and the readable range ("21-30 sur 248"), so the reader
 * always knows where they are and how much is left.
 *
 * The whole point is that no list ever loads unbounded: the caller paginates on the
 * server, this only drives it.
 */
export function Pagination({ page, pages, total, taille, onPage, onTaille, libelle = "éléments" }: PaginationProps): JSX.Element | null {
  if (total === 0) return null;
  const premier = (page - 1) * taille + 1;
  const dernier = Math.min(page * taille, total);

  return (
    <nav className="pagination" aria-label={`Pagination des ${libelle}`}>
      <span className="pagination-plage" aria-live="polite">
        {premier}-{dernier} sur {total} {libelle}
      </span>
      <span className="pagination-controles">
        <button type="button" className="btn btn-ghost btn-inline" onClick={() => onPage(1)} disabled={page <= 1} aria-label="Première page">
          Première
        </button>
        <button type="button" className="btn btn-ghost btn-inline" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Page précédente">
          Précédente
        </button>
        <span className="pagination-page">
          Page {page} sur {pages}
        </span>
        <button type="button" className="btn btn-ghost btn-inline" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Page suivante">
          Suivante
        </button>
        <button type="button" className="btn btn-ghost btn-inline" onClick={() => onPage(pages)} disabled={page >= pages} aria-label="Dernière page">
          Dernière
        </button>
      </span>
      {onTaille ? (
        <label className="pagination-taille">
          <span className="muted small">Par page</span>
          <select value={taille} onChange={(e) => onTaille(Number(e.target.value))} aria-label="Nombre par page">
            {TAILLES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </nav>
  );
}
