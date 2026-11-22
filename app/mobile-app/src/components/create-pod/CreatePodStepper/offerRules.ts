import {
  minSpendShortfallText,
  openingOfferMinSpendShortfall,
  venueOfferFloor,
} from '@duncit/utils';

import { offerMoney } from '@/components/venue-offer/offer-format';
import { parseDateTimeText, type OfferRules } from '../create-pod.form';
import type { CreatePodVenue } from '../create-pod.types';

type Translate = (key: string, opts?: { vars?: Record<string, string | number> }) => string;

/**
 * The picked venue's minimums Create Pod holds its offer to on Money: the
 * business amount on the offer's basis, and the minimum spend the offer must
 * reach at the venue's fewest guests over the picked window. The server
 * refuses both too (BELOW_MIN_BUSINESS, BELOW_MIN_SPEND). mWeb twin:
 * useCreatePodSchema.
 */
export function makeOfferRules(venues: readonly CreatePodVenue[], t: Translate): OfferRules {
  const venueOf = (venueId: string) => venues.find((venue) => venue.id === venueId) ?? null;
  return {
    floor: (values) =>
      venueOfferFloor(
        venueOf(values.venue_id)?.offer_min_business,
        values.venue_offer_model,
        t,
        offerMoney,
      ),
    shortfall: (values) => {
      const short = openingOfferMinSpendShortfall(venueOf(values.venue_id), {
        model: values.venue_offer_model,
        rate: values.venue_offer_rate,
        spots: Number(values.no_of_spots_text) || 0,
        spaceLabel: values.venue_space_label,
        start: parseDateTimeText(values.pod_date_time_text),
        end: parseDateTimeText(values.pod_end_date_time_text),
      });
      return short ? minSpendShortfallText(short, t, offerMoney) : null;
    },
  };
}
