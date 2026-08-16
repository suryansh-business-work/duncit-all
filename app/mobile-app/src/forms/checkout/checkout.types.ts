import { z } from 'zod';

import { fallbackT, type Translate } from '@/i18n/fallback';

/** Mirror of the server GSTIN rule (14 checkout chars): 2 digits, 5 A-Z, 4
 * digits, 1 A-Z, then 2 alphanumerics. Validated only when non-empty. */
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]{2}$/;
const PINCODE_RE = /^\d{4,10}$/;
const EMAIL_CHECK = z.string().email();

const PHONE_EXTENSION_RE = /^\+?\d{1,5}$/;
const PHONE_NUMBER_RE = /^\d{6,15}$/;

/**
 * Checkout contact + billing contract — RN twin of mWeb's checkout schemas.
 * Email is the ONLY mandatory contact field: the contact block is read-only
 * here (edited from the profile), so requiring a phone the buyer never filled
 * in would dead-end the payment. The billing address is mandatory unless the
 * buyer selects their saved main address. Payment-
 * method selection is handled by Razorpay's own sheet.
 *
 * The messages are copy, so they come from the shared catalogue (rule 38): the
 * form passes its live `t`, and the exports below resolve against the bundled
 * English for callers that parse the schema outside React.
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
        (v) => !v || PHONE_EXTENSION_RE.test(v),
        t('mweb.checkout.validation.phoneCodeInvalid'),
      ),
    phone_number: z
      .string()
      .trim()
      .refine((v) => !v || PHONE_NUMBER_RE.test(v), t('mweb.checkout.validation.phoneInvalid')),
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
    gstin: z.string().trim().max(15, t('mweb.checkout.validation.gstinMax')),
    save_as_main: z.boolean(),
    simulate_failure: z.boolean(),
  });
}

type CheckoutObjectValues = z.infer<ReturnType<typeof makeCheckoutObject>>;

/** Address parts required when the buyer is not reusing their saved main address. */
function addAddressIssues(values: CheckoutObjectValues, ctx: z.RefinementCtx, t: Translate) {
  if (values.same_as_main) return;
  if (values.line1.length < 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['line1'],
      message: t('mweb.checkout.validation.line1Required'),
    });
  }
  if (values.city.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['city'],
      message: t('mweb.checkout.validation.cityRequired'),
    });
  }
  if (values.state.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['state'],
      message: t('mweb.checkout.validation.stateRequired'),
    });
  }
  if (!PINCODE_RE.test(values.pincode)) {
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
  if (values.billing_email !== '' && !EMAIL_CHECK.safeParse(values.billing_email).success) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['billing_email'],
      message: t('mweb.checkout.validation.billingEmailInvalid'),
    });
  }
  if (values.has_gstin && values.gstin !== '' && !GSTIN_RE.test(values.gstin.toUpperCase())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['gstin'],
      message: t('mweb.checkout.validation.gstinInvalid'),
    });
  }
}

/** Pod checkout requires billing details for its invoice. */
export function makeCheckoutSchema(t: Translate = fallbackT) {
  return makeCheckoutObject(t).superRefine((values, ctx) => {
    addAddressIssues(values, ctx, t);
    addOptionalFieldIssues(values, ctx, t);
  });
}

/** Product checkout: the order is physically delivered, so the address stays
 * mandatory (the parcel contact comes from the saved address book). */
export function makeProductCheckoutSchema(t: Translate = fallbackT) {
  return makeCheckoutObject(t).superRefine((values, ctx) => {
    addAddressIssues(values, ctx, t);
    addOptionalFieldIssues(values, ctx, t);
  });
}

export const checkoutSchema = makeCheckoutSchema();

export const productCheckoutSchema = makeProductCheckoutSchema();

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

/** Read-only contact shown on the checkout summary, resolved from the loaded
 * profile so the card never depends solely on the form-prefill timing. */
export interface CheckoutContact {
  name: string;
  email: string;
  phone_extension: string;
  phone_number: string;
}

/** Compact read-only shape of the user's saved main address (checkout summary). */
export interface CheckoutMainAddress {
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export const checkoutDefaults: CheckoutFormValues = {
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
