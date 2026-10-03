import { z } from 'zod';
import { PINCODE } from '@duncit/regex';
import { makeRules } from '../../../lib/rules';
import type { Translate } from '../../../lib/translate';
import type { StoreServiceablePincode } from '../queries';

/** Mirrors the server's `StoreServiceablePincodeInput`. */
export const makeServiceablePincodeSchema = (t: Translate) => {
  const r = makeRules(t);
  return z.object({
    pincode: z.string().trim().regex(PINCODE, t('ecommPortal.serviceablePincodes.pincodeRule')),
    area: r.optionalText(120),
    city: r.optionalText(120),
    state: r.optionalText(120),
    is_active: z.boolean(),
  });
};

export type ServiceablePincodeValues = z.infer<ReturnType<typeof makeServiceablePincodeSchema>>;

/** The form's starting values — a blank, active pincode when creating. */
export const toServiceablePincodeValues = (row: StoreServiceablePincode | null): ServiceablePincodeValues => ({
  pincode: row?.pincode ?? '',
  area: row?.area ?? '',
  city: row?.city ?? '',
  state: row?.state ?? '',
  is_active: row?.is_active ?? true,
});
