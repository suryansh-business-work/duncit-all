import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

/** The query-string key the open rental lives under: `?rental=<id>` survives a reload and can be shared. */
export const RENTAL_PARAM = 'rental';

/**
 * Which rental's detail is open. Writes REPLACE the history entry: opening a
 * row is a view of the board, not a destination, so Back still leaves the page
 * instead of walking through every rental looked at.
 */
export function useRentalParam(): [string | null, (id: string | null) => void] {
  const [params, setParams] = useSearchParams();

  const setOpen = useCallback(
    (id: string | null) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set(RENTAL_PARAM, id);
          else next.delete(RENTAL_PARAM);
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  return [params.get(RENTAL_PARAM), setOpen];
}
