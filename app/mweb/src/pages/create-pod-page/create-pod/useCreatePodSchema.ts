import { useMemo } from 'react';
import { useTicketDiscountMaxPct } from '../../../utils/dateFormat';
import { useSmartIncentiveSettings } from '../../../utils/smartIncentive';
import type { Translate } from '../../../i18n/fallback';
import { makeCreatePodSchema } from './create-pod.form';

/**
 * The Create Pod schema for this reader.
 *
 * The schema cannot call `t` at module scope, so it is built from the reader's
 * own catalogue — the validation messages are copy like any other. The
 * multi-ticket discount cap is the admin's public setting and the Smart
 * Incentive cap is Loyalty's, so a discount above either is caught on Step 4
 * rather than by the server at publish. The Smart Incentive is only checked
 * while its programme is on — otherwise its editor is hidden.
 */
export function useCreatePodSchema(t: Translate) {
  const ticketDiscountMaxPct = useTicketDiscountMaxPct();
  const smartIncentive = useSmartIncentiveSettings();
  const smartIncentiveMaxPct = smartIncentive.enabled ? smartIncentive.maxPct : null;
  return useMemo(
    () => makeCreatePodSchema(t, ticketDiscountMaxPct, smartIncentiveMaxPct),
    [t, ticketDiscountMaxPct, smartIncentiveMaxPct],
  );
}
