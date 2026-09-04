import { useEffect, useState } from 'react';

import type { MobileAutoPodHostProjectionQuery } from '@/generated/graphql/graphql';
import { AutoPodHostProjectionDocument } from '@/graphql/auto-pods';
import { graphqlRequest } from '@/services/graphql.client';

/** What the host's numbers add up to, after every deduction Finance takes. */
export type AutoPodHostProjection = MobileAutoPodHostProjectionQuery['autoPodHostProjection'];

/** A beat after the last keystroke, so a price typed digit by digit is priced once. */
const DEBOUNCE_MS = 350;

/**
 * Re-prices an offer on the server for the ticket price and spots typed —
 * under the host's own rates, the venue's slot price and the club admin's cut
 * — so what the sheet shows as "you earn" is exactly what the save is judged
 * on. `projection` is null while there is nothing to price or the server has
 * not answered yet; `loading` covers the debounce AND the request, so the
 * sheet shows a spinner from the keystroke rather than only once the request
 * is in flight; `failed` says the last read threw, so the sheet can say so
 * rather than sit silent.
 *
 * The native counterpart of the Apollo `useQuery` on
 * `AUTO_POD_HOST_PROJECTION` in `@duncit/auto-pods` (rule 27).
 */
export function useAutoPodHostProjection(autoPodId: string | null, amount: number, spots: number) {
  const [projection, setProjection] = useState<AutoPodHostProjection | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!autoPodId || amount <= 0 || spots <= 0) {
      setProjection(null);
      setFailed(false);
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      graphqlRequest(
        AutoPodHostProjectionDocument,
        { auto_pod_doc_id: autoPodId, pod_amount: amount, no_of_spots: spots },
        { auth: true },
      )
        .then((res) => {
          if (!active) return;
          setProjection(res.autoPodHostProjection);
          setFailed(false);
        })
        .catch(() => {
          if (!active) return;
          setProjection(null);
          setFailed(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [autoPodId, amount, spots]);

  return { projection, failed, loading };
}
