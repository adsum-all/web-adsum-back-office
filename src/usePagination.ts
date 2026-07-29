import { useEffect, useMemo, useState } from "react";

const DEFAUT = 10;

export interface Paginated<T> {
  /** The rows of the current page, ready to render. */
  page: T[];
  /** 1-based page number. */
  numero: number;
  pages: number;
  total: number;
  taille: number;
  setNumero: (n: number) => void;
  setTaille: (t: number) => void;
}

/**
 * Slice a list into pages, and come back to the first page whenever the list
 * changes underneath.
 *
 * That reset is the whole point of holding this in one place: filtering a list of
 * two hundred rows down to three while sitting on page 12 shows an empty table, and
 * the reader concludes the filter found nothing. The dependency is the LENGTH rather
 * than the array itself, so a parent that rebuilds the same array on every render
 * does not fight the reader's page.
 *
 * Client-side by design: it applies to lists the API already returns whole. Lists
 * that can grow without bound (the directory, the audit journal, the informations)
 * are paginated on the server instead, and this hook is not used for them.
 */
export function usePagination<T>(items: T[], tailleInitiale = DEFAUT): Paginated<T> {
  const [numero, setNumero] = useState(1);
  const [taille, setTaille] = useState(tailleInitiale);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / taille));

  useEffect(() => {
    setNumero(1);
  }, [total, taille]);

  // A page number can outlive its list (rows removed while reading): clamp rather
  // than render an empty table that looks like an empty result.
  const courant = Math.min(numero, pages);
  const page = useMemo(
    () => items.slice((courant - 1) * taille, courant * taille),
    [items, courant, taille],
  );

  return { page, numero: courant, pages, total, taille, setNumero, setTaille };
}
