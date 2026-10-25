import { moneyRangeText, offerGuestsText, venueOfferTermsLine } from '@duncit/utils';
import { rupees } from '../pricing/format';
import type { Translate } from '../pricing/types';

/** "Per guest · ₹300 per guest" — the terms one side put forward; just the amount for an option this client does not know. */
export const offerTermsLabel = (t: Translate, model: string, rate: number): string => venueOfferTermsLine(t, model, rupees(rate));

/** "8–20 guests" when the venue is paid for fewer than the pod's spots, else "20 guests". */
export const offerGuestsLabel = (t: Translate, minGuests: number, maxGuests: number): string =>
  offerGuestsText(t, minGuests, maxGuests);

/** "₹3,000" or "₹3,000 – ₹10,000" — one amount when the fewest and the most guests cost the same. */
export const rupeesRange = (min: number, max: number): string => moneyRangeText(min, max, rupees);
