/**
 * Lot-based pager: shows "X-Y sur N (lot k/total)" with previous and next
 * controls, instead of an ever-growing "show more" list. The parent owns the
 * page state and slices its own data with pageStart/pageEnd.
 */
export function Pager({
  total,
  page,
  pageSize,
  onPage,
}: {
  total: number;
  page: number; // zero-based
  pageSize: number;
  onPage: (page: number) => void;
}): JSX.Element | null {
  if (total <= pageSize) return null;
  const totalPages = Math.ceil(total / pageSize);
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, total);
  return (
    <div className="pager" style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10, justifyContent: "flex-end" }}>
      <span className="muted small">
        {start}-{end} sur {total} (lot {page + 1}/{totalPages})
      </span>
      <button type="button" className="btn btn-ghost btn-inline" disabled={page <= 0} onClick={() => onPage(page - 1)}>
        Précédent
      </button>
      <button type="button" className="btn btn-ghost btn-inline" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
        Suivant
      </button>
    </div>
  );
}

/** Zero-based slice bounds for a page. */
export function pageSlice(page: number, pageSize: number): [number, number] {
  return [page * pageSize, (page + 1) * pageSize];
}
