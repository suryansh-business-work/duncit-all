import { useMemo } from 'react';
import { formatStatementMoney, venueOfferFloor } from '@duncit/utils';
import { usePricing } from '../../../hooks/usePricing';
import { useTicketDiscountMaxPct } from '../../../utils/dateFormat';
import { useSmartIncentiveSettings } from '../../../utils/smartIncentive';
import type { Translate } from '../../../i18n/fallback';
import { makeCreatePodSchema } from './create-pod.form';
import type { CreatePodVenue } from './create-pod.types';

/**
 * The Create Pod schema for this reader.
 *
 * The schema cannot call `t` at module scope, so it is built from the reader's
 * own catalogue — the validation messages are copy like any other. The
 * multi-ticket discount cap is the admin's public setting and the Smart
 * Incentive cap is Loyalty's, so a discount above either is caught on Step 4
 * rather than by the server at publish. The Smart Incentive is only checked
 * while its programme is on — otherwise its editor is hidden. An offer below
 * the picked venue's business amount on its basis is caught on the offer step;
 * the server refuses it too (BELOW_MIN_BUSINESS).
 */
export function useCreatePodSchema(t: Translate, venues: readonly CreatePodVenue[]) {
  const ticketDiscountMaxPct = useTicketDiscountMaxPct();
  const smartIncentive = useSmartIncentiveSettings();
  const { currency } = usePricing();
  const smartIncentiveMaxPct = smartIncentive.enabled ? smartIncentive.maxPct : null;
  return useMemo(
    () =>
      makeCreatePodSchema(t, ticketDiscountMaxPct, smartIncentiveMaxPct, (values) =>
        venueOfferFloor(
          venues.find((venue) => venue.id === values.venue_id)?.offer_min_business,
          values.venue_offer_model,
          t,
          (value) => formatStatementMoney(value, currency),
        ),
      ),
    [t, ticketDiscountMaxPct, smartIncentiveMaxPct, venues, currency],
  );
}
