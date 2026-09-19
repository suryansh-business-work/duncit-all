import { z } from 'zod';

import { optionalRule, phoneRule, pincodeRule, requiredRule } from '../../lib/validation';

type Translate = (key: string) => string;

/**
 * The courier's bar, mirrored from the server's `addressProblems`: a street
 * or city of at least three characters that is not just the country — the
 * browser's autofill likes to put "India" in both, and ShipRocket refuses it.
 */
const courierPlace = (t: Translate, key: string, max: number) =>
  requiredRule(t, key, max).refine((value) => value.length >= 3 && value.toLowerCase() !== 'india', t(key));

/** A delivery address as the store asks for it: 10-digit phone, 6-digit pincode. */
export const makeAddressSchema = (t: Translate) =>
  z.object({
    name: requiredRule(t, 'ecommStore.validation.nameRequired', 120),
    phone: phoneRule(t),
    line1: courierPlace(t, 'ecommStore.validation.line1Required', 200),
    line2: optionalRule(t, 200),
    landmark: optionalRule(t, 160),
    city: courierPlace(t, 'ecommStore.validation.cityRequired', 120),
    state: requiredRule(t, 'ecommStore.validation.stateRequired', 120),
    pincode: pincodeRule(t),
  });

export type AddressValues = z.infer<ReturnType<typeof makeAddressSchema>>;

export const emptyAddress = (pincode = ''): AddressValues => ({
  name: '',
  phone: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode,
});
