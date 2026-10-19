import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { useDateFormat } from '@duncit/app-settings';

import { STORE_HOME, type StoreHomeSection } from '../../graphql/catalog';

const MIN_PARAM = 'min';
const MAX_PCT = 100;

/** `?min=20` as a whole percentage in 1..99, else null (every deal). */
function readMin(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 && parsed < MAX_PCT ? parsed : null;
}

/**
 * The deals page's discount tabs and the live flash sale they come from: the
 * first FLASH_SALE on the home page whose countdown has not ended. Read through
 * the cache, so a shopper arriving from the home page costs no request. The
 * chosen tier lives in the URL, so a filtered deals page can be shared.
 */
export function useDealTiers() {
  const { now } = useDateFormat();
  const [params, setParams] = useSearchParams();
  const { data } = useQuery(STORE_HOME, { fetchPolicy: 'cache-first' });
  const nowMs = now().getTime();
  const flash: StoreHomeSection | undefined = data?.storeHome.find(
    (s) => s.kind === 'FLASH_SALE' && !(s.ends_at && Date.parse(s.ends_at) <= nowMs),
  );
  const min = readMin(params.get(MIN_PARAM));

  const setMin = useCallback(
    (next: number | null) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          if (next === null) updated.delete(MIN_PARAM);
          else updated.set(MIN_PARAM, String(next));
          return updated;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { tiers: flash?.discount_tiers ?? [], flash, min, setMin };
}
