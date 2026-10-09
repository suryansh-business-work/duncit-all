import { z } from 'zod';
import { PERSON_NAME, PHONE_NUMBER_IN, PINCODE, toDigits } from '@duncit/regex';

import { makeAddressSchema } from './address';
import type { Translate } from './translate';

/**
 * A courier ship-to — what a brand corrects on a pod-shop order before
 * ShipRocket has it (mWeb's and the native Studio's "Fix address").
 *
 * It is the saved-address contract with the label dropped and the three parts a
 * courier cannot deliver without made strict: a recipient name, an Indian
 * mobile number (judged on its last ten digits, as the server stores it) and a
 * six-digit PIN. The server refuses the same three, so the form says it first.
 */
export const makeShipToSchema = (t: Translate) =>
  makeAddressSchema(t)
    .omit({ label: true })
    .extend({
      name: z
        .string()
        .trim()
        .min(1, t('mweb.address.validation.nameRequired'))
        .max(120)
        .refine((v) => PERSON_NAME.test(v), t('mweb.address.validation.nameInvalid')),
      phone: z
        .string()
        .trim()
        .refine(
          (v) => PHONE_NUMBER_IN.test(toDigits(v).slice(-10)),
          t('mweb.address.validation.phoneInvalid'),
        ),
      pincode: z
        .string()
        .trim()
        .refine((v) => PINCODE.test(v), t('mweb.address.validation.pincodeInvalid')),
    });

export type ShipToValues = z.infer<ReturnType<typeof makeShipToSchema>>;

/** An order's ship-to as the server sends it (any part may be missing). */
export type ShipToSource = Partial<Record<keyof ShipToValues, string | null>>;

/** The form's starting values: the order's current ship-to, or a blank one. */
export function shipToValues(address: ShipToSource | null | undefined): ShipToValues {
  const text = (v: string | null | undefined) => v ?? '';
  return {
    name: text(address?.name),
    phone: text(address?.phone),
    line1: text(address?.line1),
    line2: text(address?.line2),
    landmark: text(address?.landmark),
    city: text(address?.city),
    state: text(address?.state),
    pincode: text(address?.pincode),
    country: address?.country || 'India',
  };
}
