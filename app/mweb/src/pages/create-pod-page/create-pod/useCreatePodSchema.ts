import { useMemo } from 'react';
import { useTicketDiscountMaxPct } from '../../../utils/dateFormat';
import type { Translate } from '../../../i18n/fallback';
import { makeCreatePodSchema } from './create-pod.form';

/**
 * The Create Pod schema for this reader.
 *
 * The schema cannot call `t` at module scope, so it is built from the reader's
 * own catalogue — the validation messages are copy like any other. The
 * multi-ticket discount cap is the admin's public setting, so a tier above it
 * is caught on Step 4 rather than by the server at publish.
 */
export function useCreatePodSchema(t: Translate) {
  const ticketDiscountMaxPct = useTicketDiscountMaxPct();
  return useMemo(() => makeCreatePodSchema(t, ticketDiscountMaxPct), [t, ticketDiscountMaxPct]);
}
