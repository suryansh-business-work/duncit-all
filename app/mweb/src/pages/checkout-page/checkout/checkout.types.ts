import { z } from 'zod';
import { fallbackT, type Translate } from '../../../i18n/fallback';
import type { CheckoutForm } from '../queries';

export const PHONE_NUMBER_PATTERN = /^\d{6,15}$/;
export const PHONE_EXTENSION_PATTERN = /^\+?\d{1,5}$/;
export const PINCODE_PATTERN = /^\d{4,10}$/;
// Mirrors the server billing validator (payment.validator.ts): 2 digits, 5
// letters, 4 digits, 1 letter, then 2 alphanumerics. Validated uppercased.
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][\dA-Z]{2}$/;

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
 * structured billing address that may differ from the user's main address.
 * Email is the ONLY mandatory contact field: the contact block is read-only
 * here (it is edited from the profile), so requiring a phone the buyer has not
 * filled in would dead-end the payment. GSTIN, phone and billing email validate
 * only when provided. Mirrors the server rules (payment.validator.ts).
 *
 * The messages are copy, so they come from the shared catalogue (rule 38): the
 * session passes its live `t`, and the exports below resolve against the
 * bundled English for callers that parse the schema outside React.
 */
function makeCheckoutObject(t: Translate) {
  return z.object({
    full_name: z.string().trim().max(160, t('mweb.checkout.validation.nameMax')),
    email: z
      .string()
      .trim()
      .min(1, t('mweb.auth.validation.emailRequired'))
      .email(t('mweb.auth.validation.emailInvalid'))
      .max(254),
    phone_extension: z
      .string()
      .trim()
      .refine(
        (v) => !v || PHONE_EXTENSION_PATTERN.test(v),
        t('mweb.checkout.validation.phoneCodeInvalid'),
      ),
    phone_number: z
      .string()
      .trim()
      .refine((v) => !v || PHONE_NUMBER_PATTERN.test(v), t('mweb.checkout.validation.phoneInvalid')),
    same_as_main: z.boolean(),
    line1: z.string().trim().max(200, t('mweb.checkout.validation.line1Max')),
    line2: z.string().trim().max(200, t('mweb.checkout.validation.line2Max')),
    landmark: z.string().trim().max(160, t('mweb.checkout.validation.landmarkMax')),
    city: z.string().trim().max(120, t('mweb.checkout.validation.cityMax')),
    state: z.string().trim().max(120, t('mweb.checkout.validation.stateMax')),
    pincode: z.string().trim().max(10, t('mweb.checkout.validation.pincodeMax')),
    country: z.string().trim().max(80, t('mweb.checkout.validation.countryMax')),
    billing_email: z.string().trim().max(254, t('mweb.checkout.validation.billingEmailMax')),
    has_gstin: z.boolean(),
    gstin: z.string().trim().max(20, t('mweb.checkout.validation.gstinMax')),
    save_as_main: z.boolean(),
    simulate_failure: z.boolean(),
  });
}

type CheckoutObjectValues = z.infer<ReturnType<typeof makeCheckoutObject>>;

/** Address parts required when the buyer is not reusing their saved main address. */
function addAddressIssues(values: CheckoutObjectValues, ctx: z.RefinementCtx, t: Translate) {
  if (values.same_as_main) return;
  if (values.line1.trim().length < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['line1'],
      message: t('mweb.checkout.validation.line1Required'),
    });
  }
  if (!values.city.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['city'],
      message: t('mweb.checkout.validation.cityRequired'),
    });
  }
  if (!values.state.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['state'],
      message: t('mweb.checkout.validation.stateRequired'),
    });
  }
  if (!PINCODE_PATTERN.test(values.pincode.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['pincode'],
      message: t('mweb.checkout.validation.pincodeInvalid'),
    });
  }
}

/** GSTIN and the separate billing email are optional everywhere — checked only
 * once the buyer typed something. */
function addOptionalFieldIssues(values: CheckoutObjectValues, ctx: z.RefinementCtx, t: Translate) {
  const gstin = values.gstin.trim().toUpperCase();
  if (values.has_gstin && gstin && !GSTIN_PATTERN.test(gstin)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['gstin'],
      message: t('mweb.checkout.validation.gstinInvalid'),
    });
  }
  const billingEmail = values.billing_email.trim();
  if (billingEmail && !isEmail(billingEmail)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['billing_email'],
      message: t('mweb.checkout.validation.billingEmailInvalid'),
    });
  }
}

/**
 * Pod checkout requires billing details for its invoice.
 */
export function makeCheckoutSchema(t: Translate = fallbackT) {
  return makeCheckoutObject(t).superRefine((values, ctx) => {
    addAddressIssues(values, ctx, t);
    addOptionalFieldIssues(values, ctx, t);
  });
}

/**
 * Product checkout: the order is physically delivered, so the address stays
 * mandatory (the parcel contact comes from the saved address book). It
 * currently applies the same rules as the pod checkout; this alias is the one
 * place to diverge later.
 */
export const makeProductCheckoutSchema = makeCheckoutSchema;

export const checkoutSchema = makeCheckoutSchema();

export const productCheckoutSchema = makeProductCheckoutSchema();

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
 * no saved main address to begin with. An empty address is never saved — the pod
 * checkout allows one, and the profile mutation would reject it. */
export function shouldPersistMainAddress(values: CheckoutForm, hasMainAddress: boolean): boolean {
  return values.save_as_main && !values.same_as_main && !hasMainAddress && !!values.line1.trim();
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
