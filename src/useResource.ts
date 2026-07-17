import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "./api.js";

export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

// Load an async resource, exposing loading and error states plus a manual reload so
// list views can refresh after a mutation. An optional pollMs polls the loader on an
// interval, so a change made in another authorized session appears here within a short
// delay without a manual page refresh (the API is the source of truth; anon/authenticated
// are revoked, so there is no browser Realtime channel to secure). Background refreshes
// never flip the spinner (no flicker) and pause while the tab is hidden.
export function useResource<T>(loader: () => Promise<T>, deps: unknown[], pollMs: number = 20000): ResourceState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const hasData = useRef(false);

  const reload = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    let alive = true;
    // Spinner only before the first successful load; a refetch keeps the current data
    // on screen so a poll or a filter change never blanks the list.
    if (!hasData.current) setLoading(true);
    loader()
      .then((result) => {
        if (alive) {
          setData(result);
          hasData.current = true;
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (alive) {
          setError(err instanceof ApiError ? err.message : "Erreur reseau");
          setLoading(false);
        }
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  useEffect(() => {
    if (!pollMs || pollMs <= 0 || typeof window === "undefined") return undefined;
    const refresh = (): void => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        setTick((value) => value + 1);
      }
    };
    const handle = window.setInterval(refresh, pollMs);
    // Refetch the moment the operator returns to the tab, so a change made elsewhere is seen
    // without a manual refresh (near-instant on focus, and within pollMs otherwise).
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(handle);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pollMs]);

  return { data, loading, error, reload };
}
