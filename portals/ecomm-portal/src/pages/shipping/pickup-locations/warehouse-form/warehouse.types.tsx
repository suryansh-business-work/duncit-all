import { z } from 'zod';
import { makeRules } from '../../../../lib/rules';
import type { Translate } from '../../../../lib/translate';
import type { Warehouse, WarehouseInput } from '../../queries';

/** Letters, digits, spaces, dots, dashes and underscores — what ShipRocket takes as a pickup name. */
const NICKNAME = /^[\w .-]{2,60}$/;
const PHONE = /^\d{10}$/;
const PINCODE = /^\d{6}$/;
/** ShipRocket refuses a pickup street line shorter than this. */
const MIN_STREET = 10;
const MIN_CITY = 3;

const digits10 = (value: string) => value.replaceAll(/\D/g, '').slice(-10);

/**
 * Mirrors the server's pickup rule (`pickupProblems`): what ShipRocket would
 * refuse is refused here first, in words that say what to fix.
 */
export const makeWarehouseSchema = (t: Translate) => {
  const rules = makeRules(t);
  return z.object({
    nickname: z.string().trim().regex(NICKNAME, t('ecommPortal.shipping.nicknameRule')),
    contact_name: rules.requiredText(160),
    phone: z.string().trim().refine((value) => PHONE.test(digits10(value)), t('ecommPortal.shipping.phoneRule')),
    email: rules.email().refine((value) => value !== '', t('ecommPortal.form.required')),
    address_line1: rules.requiredText(200).refine((value) => value.length >= MIN_STREET, t('ecommPortal.shipping.pickupStreetRule')),
    address_line2: rules.optionalText(200),
    city: rules.requiredText(120).refine((value) => value.length >= MIN_CITY && value.toLowerCase() !== 'india', t('ecommPortal.shipping.cityRule')),
    state: rules.requiredText(120),
    pincode: z.string().trim().regex(PINCODE, t('ecommPortal.shipping.pincodeRule')),
    is_default: z.boolean(),
  });
};

export type WarehouseValues = z.infer<ReturnType<typeof makeWarehouseSchema>>;

export const warehouseDefaults = (warehouse: Warehouse | null): WarehouseValues => ({
  nickname: warehouse?.nickname ?? '',
  contact_name: warehouse?.contact_name ?? '',
  phone: warehouse?.phone ?? '',
  email: warehouse?.email ?? '',
  address_line1: warehouse?.address_line1 ?? '',
  address_line2: warehouse?.address_line2 ?? '',
  city: warehouse?.city ?? '',
  state: warehouse?.state ?? '',
  pincode: warehouse?.pincode ?? '',
  is_default: warehouse?.is_default ?? false,
});

export const toWarehouseInput = (values: WarehouseValues): WarehouseInput => ({
  ...values,
  phone: digits10(values.phone),
});
