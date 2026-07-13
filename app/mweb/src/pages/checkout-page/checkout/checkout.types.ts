import { z } from 'zod';
import type { CheckoutForm } from '../queries';

export const PHONE_NUMBER_PATTERN = /^\d{6,15}$/;
export const PHONE_EXTENSION_PATTERN = /^\+?\d{1,5}$/;
export const PINCODE_PATTERN = /^\d{4,10}$/;
// Mirrors the server billing validator (payment.validator.ts): 2 digits, 5
// letters, 4 digits, 1 letter, then 2 alphanumerics. Validated uppercased.
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]{2}$/;

/** The seven postal-address parts shared by the main address and checkout billing. */
export interface PostalAddressParts {
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

const isEmail = (value: string) => z.string().email().safeParse(value).success;

/**
 * Checkout contract — RHF + Zod. Contact details (name/email/phone) plus a
 * structured billing address that may differ from the user's main address. The
 * address fields are only required when "Same as my main address" is unchecked;
 * GSTIN and billing email validate only when provided. Mirrors the server's
 * CheckoutBillingInput rules (payment.validator.ts).
 */
export const checkoutSchema = z
  .object({
    full_name: z.string().trim().max(160, 'Name must be 160 characters or fewer'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(254),
    phone_extension: z
      .string()
      .trim()
      .min(1, 'Phone code is required')
      .regex(PHONE_EXTENSION_PATTERN, 'Phone code is invalid'),
    phone_number: z
      .string()
      .trim()
      .min(1, 'Phone is required')
      .regex(PHONE_NUMBER_PATTERN, 'Phone must contain only digits (6-15 digits)'),
    same_as_main: z.boolean(),
    line1: z.string().trim().max(200, 'Address line 1 must be 200 characters or fewer'),
    line2: z.string().trim().max(200, 'Address line 2 must be 200 characters or fewer'),
    landmark: z.string().trim().max(160, 'Landmark must be 160 characters or fewer'),
    city: z.string().trim().max(120, 'City must be 120 characters or fewer'),
    state: z.string().trim().max(120, 'State must be 120 characters or fewer'),
    pincode: z.string().trim().max(10, 'Pincode must be 10 characters or fewer'),
    country: z.string().trim().max(80, 'Country must be 80 characters or fewer'),
    billing_email: z.string().trim().max(254),
    has_gstin: z.boolean(),
    gstin: z.string().trim().max(20),
    save_as_main: z.boolean(),
    simulate_failure: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!values.same_as_main) {
      if (values.line1.trim().length < 3) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['line1'], message: 'Address line 1 is required' });
      }
      if (!values.city.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['city'], message: 'City is required' });
      }
      if (!values.state.trim()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['state'], message: 'State is required' });
      }
      if (!PINCODE_PATTERN.test(values.pincode.trim())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pincode'], message: 'Enter a valid pincode' });
      }
    }
    const gstin = values.gstin.trim().toUpperCase();
    if (values.has_gstin && gstin && !GSTIN_PATTERN.test(gstin)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['gstin'], message: 'Enter a valid 15-character GSTIN' });
    }
    const billingEmail = values.billing_email.trim();
    if (billingEmail && !isEmail(billingEmail)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['billing_email'], message: 'Enter a valid billing email' });
    }
  });

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const checkoutDefaults: CheckoutForm = {
  full_name: '',
  email: '',
  phone_extension: '+91',
  phone_number: '',
  same_as_main: false,
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  billing_email: '',
  has_gstin: false,
  gstin: '',
  save_as_main: false,
  simulate_failure: false,
};

/** Contact payload sent to the server (email lowercased; name trimmed). */
export function toCheckoutContact(values: CheckoutForm) {
  return {
    contact_name: values.full_name.trim(),
    contact_email: values.email.trim().toLowerCase(),
    contact_phone_extension: values.phone_extension.trim(),
    contact_phone_number: values.phone_number.trim(),
    simulate_failure: values.simulate_failure,
  };
}

/** The final billing address: the main address when "same as main", else the
 * fields the buyer typed. Country falls back to "India". */
export function resolveBillingAddress(
  values: CheckoutForm,
  mainAddress?: PostalAddressParts | null,
): PostalAddressParts {
  if (values.same_as_main && mainAddress) {
    return {
      line1: (mainAddress.line1 ?? '').trim(),
      line2: (mainAddress.line2 ?? '').trim(),
      landmark: (mainAddress.landmark ?? '').trim(),
      city: (mainAddress.city ?? '').trim(),
      state: (mainAddress.state ?? '').trim(),
      pincode: (mainAddress.pincode ?? '').trim(),
      country: (mainAddress.country ?? '').trim() || 'India',
    };
  }
  return {
    line1: values.line1.trim(),
    line2: values.line2.trim(),
    landmark: values.landmark.trim(),
    city: values.city.trim(),
    state: values.state.trim(),
    pincode: values.pincode.trim(),
    country: values.country.trim() || 'India',
  };
}

/** Whether to persist the entered billing address as the buyer's main address on
 * pay: only when they opted in, typed a fresh (not same-as-main) address, and had
 * no saved main address to begin with. */
export function shouldPersistMainAddress(values: CheckoutForm, hasMainAddress: boolean): boolean {
  return values.save_as_main && !values.same_as_main && !hasMainAddress;
}

/** Build the CheckoutBillingInput sent on pay. GSTIN is uppercased and only sent
 * when the buyer toggled "I have a GSTIN" and typed one; the billing email is
 * only sent when it differs from the contact email (empty means "use the contact
 * email"). */
export function toCheckoutBilling(values: CheckoutForm, mainAddress?: PostalAddressParts | null) {
  const address = resolveBillingAddress(values, mainAddress);
  const gstin = values.gstin.trim().toUpperCase();
  const billingEmail = values.billing_email.trim().toLowerCase();
  const contactEmail = values.email.trim().toLowerCase();
  const billing: PostalAddressParts & { gstin?: string; email?: string } = { ...address };
  if (values.has_gstin && gstin) billing.gstin = gstin;
  if (billingEmail && billingEmail !== contactEmail) billing.email = billingEmail;
  return billing;
}
