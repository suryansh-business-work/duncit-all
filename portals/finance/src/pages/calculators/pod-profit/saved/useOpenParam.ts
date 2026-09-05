import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Which saved calculation is open, held in the query string.
 *
 * Both tabs need exactly this and they must not share a key — the single tab's
 * `?calculation=` and the multi tab's `?calculator=` are independent, and both
 * are independent of the strip's `?selectedtab=`. So the KEY is the parameter
 * and the behaviour is shared (rule 40).
 *
 * Writes REPLACE the history entry: opening a row is a view of the page, not a
 * destination, and pushing one entry per click means Back walks through every
 * row you looked at before it leaves the page.
 */
export function useOpenParam(param: string): [string | null, (id: string | null) => void] {
  const [params, setParams] = useSearchParams();

  const setOpen = useCallback(
    (id: string | null) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) {
            next.set(param, id);
          } else {
            next.delete(param);
          }
          return next;
        },
        { replace: true }
      );
    },
    [param, setParams]
  );

  return [params.get(param), setOpen];
}
