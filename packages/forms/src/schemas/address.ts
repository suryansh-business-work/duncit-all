import { z } from 'zod';
import { PERSON_NAME, PHONE_INTL, PINCODE_LOOSE, toDigits } from '@duncit/regex';

import type { Translate } from './translate';

/**
 * One saved address, as mWeb and the native app both ask for it.
 *
 * Every shape it checks comes from @duncit/regex (rule 40): the recipient name
 * takes the same PERSON_NAME the rest of the app asks for, the number is read
 * through `toDigits` so a pasted "+91 98765 43210" is judged on its digits
 * rather than its spacing, and the postal code is the loose 4–10 digit one that
 * fits non-Indian addresses.
 *
 * Both surfaces had written this out separately, which is how the recipient's
 * name and number ended up with no rule at all on either of them — a `max(120)`
 * and a `max(20)` and nothing about what the characters could be. It lives here
 * for the same reason `contact-change` does: one set of rules, one set of
 * sentences, no chance of the two apps refusing different parcels (rule 27).
 */
export const makeAddressSchema = (t: Translate) =>
  z.object({
    label: z.string().trim().min(1, t('mweb.address.validation.labelRequired')).max(60),
    name: z
      .string()
      .trim()
      .max(120)
      .refine((v) => v === '' || PERSON_NAME.test(v), t('mweb.address.validation.nameInvalid')),
    phone: z
      .string()
      .trim()
      .max(20)
      .refine(
        (v) => v === '' || PHONE_INTL.test(toDigits(v)),
        t('mweb.address.validation.phoneInvalid'),
      ),
    line1: z.string().trim().min(1, t('mweb.address.validation.line1Required')).max(200),
    line2: z.string().trim().max(200),
    landmark: z.string().trim().max(160),
    city: z.string().trim().min(1, t('mweb.address.validation.cityRequired')).max(120),
    state: z.string().trim().min(1, t('mweb.address.validation.stateRequired')).max(120),
    pincode: z
      .string()
      .trim()
      .refine((v) => PINCODE_LOOSE.test(v), t('mweb.address.validation.pincodeInvalid')),
    country: z.string().trim().max(80),
  });

/** What the native sheet holds. mWeb extends it with the `is_default` flag. */
export type AddressValues = z.infer<ReturnType<typeof makeAddressSchema>>;

/** The empty address. `label` is filled in by each surface from the catalogue —
 * it is prefilled copy the user reads, so it cannot live here as a literal. */
export const blankAddress: AddressValues = {
  label: '',
  name: '',
  phone: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
};
