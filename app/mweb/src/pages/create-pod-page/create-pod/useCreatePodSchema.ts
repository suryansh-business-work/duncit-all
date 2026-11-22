import { useMemo } from 'react';
import { formatStatementMoney, minSpendShortfallText, openingOfferMinSpendShortfall, venueOfferFloor } from '@duncit/utils';
import { usePricing } from '../../../hooks/usePricing';
import { useSmartIncentiveSettings } from '../../../utils/smartIncentive';
import type { Translate } from '../../../i18n/fallback';
import { makeCreatePodSchema } from './create-pod.form';
import { usePodMinAdvance } from './usePodMinAdvance';
import type { CreatePodVenue } from './create-pod.types';

/**
 * The Create Pod schema for this reader.
 *
 * The schema cannot call `t` at module scope, so it is built from the reader's
 * own catalogue — the validation messages are copy like any other. The Smart
 * Incentive cap is Loyalty's, so a discount above it is caught on Step 4
 * rather than by the server at publish. The Smart Incentive is only checked
 * while its programme is on — otherwise its editor is hidden. An offer below
 * the picked venue's business amount on its basis, or short of its minimum
 * spend, is caught on the offer step; the server refuses both too
 * (BELOW_MIN_BUSINESS, BELOW_MIN_SPEND).
 */
export function useCreatePodSchema(t: Translate, venues: readonly CreatePodVenue[]) {
  const smartIncentive = useSmartIncentiveSettings();
  const { currency } = usePricing();
  const smartIncentiveMaxPct = smartIncentive.enabled ? smartIncentive.maxPct : null;
  const minAdvance = usePodMinAdvance();
  return useMemo(() => {
    const money = (value: number) => formatStatementMoney(value, currency);
    const venueOf = (venueId: string) => venues.find((venue) => venue.id === venueId) ?? null;
    return makeCreatePodSchema(
      t,
      smartIncentiveMaxPct,
      (values) => venueOfferFloor(venueOf(values.venue_id)?.offer_min_business, values.venue_offer_model, t, money),
      minAdvance,
      (values) => {
        const short = openingOfferMinSpendShortfall(venueOf(values.venue_id), {
          model: values.venue_offer_model,
          rate: values.venue_offer_rate,
          spots: values.no_of_spots,
          spaceLabel: values.venue_space_label,
          start: values.pod_date_time,
          end: values.pod_end_date_time,
        });
        return short ? minSpendShortfallText(short, t, money) : null;
      },
    );
  }, [t, smartIncentiveMaxPct, venues, currency, minAdvance]);
}
