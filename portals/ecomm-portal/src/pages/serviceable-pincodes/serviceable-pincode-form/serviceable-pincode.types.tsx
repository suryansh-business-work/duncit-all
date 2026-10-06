import { z } from 'zod';
import { PINCODE } from '@duncit/regex';
import { getStatesForCountry } from '@duncit/geo';
import { makeRules } from '../../../lib/rules';
import type { Translate } from '../../../lib/translate';
import type { StoreServiceablePincode } from '../queries';

/** Where a pincode the store has not placed yet starts: the store only ships inside India. */
const DEFAULT_COUNTRY_CODE = 'IN';

/**
 * Mirrors the server's `StoreServiceablePincodeInput`, plus the two ISO codes
 * the Country → State → City pickers chain on (they are not stored).
 */
export const makeServiceablePincodeSchema = (t: Translate) => {
  const r = makeRules(t);
  return z.object({
    country_code: r.requiredText(2),
    state: r.requiredText(120),
    state_code: z.string(),
    city: r.requiredText(120),
    pincode: z.string().trim().regex(PINCODE, t('ecommPortal.serviceablePincodes.pincodeRule')),
    area: r.optionalText(120),
    is_active: z.boolean(),
  });
};

export type ServiceablePincodeValues = z.infer<ReturnType<typeof makeServiceablePincodeSchema>>;

/** The ISO code of a state typed or chosen by name — '' when the country does not list it. */
export const stateCodeFor = (countryCode: string, stateName: string) =>
  getStatesForCountry(countryCode).find((state) => state.name.toLowerCase() === stateName.trim().toLowerCase())?.isoCode ?? '';

/** The form's starting values — a blank, active pincode in India when creating. */
export const toServiceablePincodeValues = (row: StoreServiceablePincode | null): ServiceablePincodeValues => {
  const state = row?.state ?? '';
  return {
    country_code: DEFAULT_COUNTRY_CODE,
    state,
    state_code: stateCodeFor(DEFAULT_COUNTRY_CODE, state),
    city: row?.city ?? '',
    pincode: row?.pincode ?? '',
    area: row?.area ?? '',
    is_active: row?.is_active ?? true,
  };
};

/** What the save mutation takes — the pickers' ISO codes stay in the form. */
export const toServiceablePincodeInput = ({ pincode, area, city, state, is_active }: ServiceablePincodeValues) => ({
  pincode,
  area,
  city,
  state,
  is_active,
});
