import { z } from 'zod';

import type {
  AddressInput,
  AddressValues,
  VerificationAddress,
  VerificationTranslate,
} from './types';

/** An empty address form. */
export const blankAddressValues: AddressValues = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  country: '',
};

/**
 * The address as a caller's GraphQL codegen hands it over.
 *
 * Every field is optional here even though `VerificationAddress` declares them:
 * the native app's generated types mark selected fields optional, and the
 * package has to accept what each surface's codegen actually produces rather
 * than making three call sites cast.
 */
type AddressLike = Readonly<Partial<Record<keyof VerificationAddress, string | null>>>;

/** Seeds the form from whatever the account already submitted. */
export function addressValuesFrom(
  item: Readonly<{ address?: AddressLike | null }>,
): AddressValues {
  return {
    line1: item.address?.line1 ?? '',
    line2: item.address?.line2 ?? '',
    city: item.address?.city ?? '',
    state: item.address?.state ?? '',
    pincode: item.address?.pincode ?? '',
    country: item.address?.country ?? '',
  };
}

/**
 * The address verification schema, with messages the reader's language.
 *
 * A factory rather than a constant because the messages are localized and Zod
 * schemas are built outside React: the form that renders passes its own `t`, so
 * one schema follows whichever language the surface resolved (rule 38).
 */
export function makeAddressSchema(t: VerificationTranslate) {
  return z.object({
    line1: z.string().trim().min(1, t('verification.line1Required')),
    line2: z.string().trim(),
    city: z.string().trim().min(1, t('verification.cityRequired')),
    state: z.string().trim().min(1, t('verification.stateRequired')),
    pincode: z.string().trim().min(1, t('verification.pincodeRequired')),
    country: z.string().trim(),
  });
}

/** The parsed shape `makeAddressSchema` produces. */
export type AddressSchema = ReturnType<typeof makeAddressSchema>;

/**
 * Whether the four required fields are filled.
 *
 * The MUI cards validate on submit without a resolver, so they need the same
 * answer the schema gives without paying for a parse — and without a second
 * hand-written list of which fields are mandatory.
 */
export function isAddressComplete(values: Readonly<AddressValues>): boolean {
  return Boolean(
    values.line1.trim() && values.city.trim() && values.state.trim() && values.pincode.trim(),
  );
}

/** Maps form values onto the `submitAddressVerification` input, dropping blanks. */
export function buildAddressInput(values: Readonly<AddressValues>): AddressInput {
  return {
    line1: values.line1.trim(),
    line2: values.line2.trim() || undefined,
    city: values.city.trim(),
    state: values.state.trim(),
    pincode: values.pincode.trim(),
    country: values.country.trim() || undefined,
  };
}

/** One input on the address form, described rather than hard-coded. */
export interface AddressField {
  name: keyof AddressValues;
  labelKey: string;
  placeholderKey: string;
  required: boolean;
}

/**
 * The address form, grouped into the rows a wide layout puts side by side: the
 * two address lines run full width, then state/city and pincode/country pair up.
 *
 * The layout is data rather than markup so a card renders it by mapping — there
 * is no field-name lookup that could miss — and the narrow native form reads the
 * same order by flattening it. mWeb, the partner console and the app therefore
 * cannot drift on which field is optional or which label sits above which input.
 */
export const ADDRESS_ROWS: ReadonlyArray<readonly AddressField[]> = [
  [
    {
      name: 'line1',
      labelKey: 'verification.line1',
      placeholderKey: 'verification.line1Placeholder',
      required: true,
    },
  ],
  [
    {
      name: 'line2',
      labelKey: 'verification.line2',
      placeholderKey: 'verification.line2Placeholder',
      required: false,
    },
  ],
  [
    {
      name: 'state',
      labelKey: 'verification.state',
      placeholderKey: 'verification.statePlaceholder',
      required: true,
    },
    {
      name: 'city',
      labelKey: 'verification.city',
      placeholderKey: 'verification.cityPlaceholder',
      required: true,
    },
  ],
  [
    {
      name: 'pincode',
      labelKey: 'verification.pincode',
      placeholderKey: 'verification.pincodePlaceholder',
      required: true,
    },
    {
      name: 'country',
      labelKey: 'verification.country',
      placeholderKey: 'verification.countryPlaceholder',
      required: false,
    },
  ],
];

/** Every field in render order — the flat read of the layout above. */
export const ADDRESS_FIELDS: readonly AddressField[] = ADDRESS_ROWS.flat();
