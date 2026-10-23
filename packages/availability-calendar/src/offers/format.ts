import { venueOfferInboxModelKey } from '@duncit/utils';
import { rupees } from '../pricing/format';
import type { Translate } from '../pricing/types';

/** "Per guest · ₹300 per guest" — the terms one side put forward; just the amount for an option this client does not know. */
export function offerTermsLabel(t: Translate, model: string, rate: number): string {
  const keys = venueOfferInboxModelKey(model);
  if (!keys) return rupees(rate);
  return t('availability.offers.termsLine', {
    vars: { model: t(keys.label), rate: t(keys.rate, { vars: { rate: rupees(rate) } }) },
  });
}
