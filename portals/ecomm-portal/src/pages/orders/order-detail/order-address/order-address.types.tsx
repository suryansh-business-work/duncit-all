import { z } from 'zod';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import type { OrderAddress, } from '../../queries';
import type { ShippingAddressInput } from '../../shipping-queries';

const PHONE = /^\d{10}$/;
const PINCODE = /^\d{6}$/;
const MIN_TEXT = 3;

/**
 * Mirrors the server's courier rule (`addressProblems`): a street and a city a
 * courier will accept — not just "India", not shorter than three characters.
 */
export const makeOrderAddressSchema = (t: Translate) => {
  const rules = makeRules(t);
  const place = (max: number, message: string) =>
    rules.requiredText(max).refine((value) => value.length >= MIN_TEXT && value.toLowerCase() !== 'india', message);
  return z.object({
    name: rules.requiredText(160),
    phone: z.string().trim().refine((value) => PHONE.test(value.replaceAll(/\D/g, '').slice(-10)), t('ecommPortal.shipping.phoneRule')),
    line1: place(200, t('ecommPortal.shipping.streetRule')),
    line2: rules.optionalText(200),
    landmark: rules.optionalText(160),
    city: place(120, t('ecommPortal.shipping.cityRule')),
    state: rules.requiredText(120),
    pincode: z.string().trim().regex(PINCODE, t('ecommPortal.shipping.pincodeRule')),
  });
};

export type OrderAddressValues = z.infer<ReturnType<typeof makeOrderAddressSchema>>;

export const addressDefaults = (address: OrderAddress | null): OrderAddressValues => ({
  name: address?.name ?? '',
  phone: address?.phone ?? '',
  line1: address?.line1 ?? '',
  line2: address?.line2 ?? '',
  landmark: address?.landmark ?? '',
  city: address?.city ?? '',
  state: address?.state ?? '',
  pincode: address?.pincode ?? '',
});

export const toAddressInput = (values: OrderAddressValues): ShippingAddressInput => ({
  ...values,
  phone: values.phone.replaceAll(/\D/g, '').slice(-10),
});
