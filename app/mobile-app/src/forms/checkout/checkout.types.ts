import { z } from 'zod';

/** Mirror of the server GSTIN rule (14 checkout chars): 2 digits, 5 A-Z, 4
 * digits, 1 A-Z, then 2 alphanumerics. Validated only when non-empty. */
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]{2}$/;
const PINCODE_RE = /^\d{4,10}$/;
const EMAIL_CHECK = z.string().email();

/**
 * Checkout contact + billing contract — RN twin of mWeb's checkoutFormSchema.
 * The billing address is validated only when it is not "same as my main
 * address" (the toggled-on case reuses the saved main address). Payment-method
 * selection is handled by Razorpay's own sheet, so there is no in-app picker.
 */
export const checkoutSchema = z
  .object({
    full_name: z.string().trim().min(1, 'Full name is required').max(160, 'Too long'),
    email: z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(254),
    phone_extension: z
      .string()
      .trim()
      .regex(/^\+?\d{1,5}$/, 'Use a code like +91'),
    phone_number: z
      .string()
      .trim()
      .regex(/^\d{6,15}$/, 'Enter a valid phone number'),
    same_as_main: z.boolean(),
    line1: z.string().trim().max(200, 'Too long'),
    line2: z.string().trim().max(200, 'Too long'),
    landmark: z.string().trim().max(160, 'Too long'),
    city: z.string().trim().max(120, 'Too long'),
    state: z.string().trim().max(120, 'Too long'),
    pincode: z.string().trim().max(10, 'Too long'),
    country: z.string().trim().max(80, 'Too long'),
    billing_email: z.string().trim().max(254, 'Too long'),
    has_gstin: z.boolean(),
    gstin: z.string().trim().max(15, 'Too long'),
    save_as_main: z.boolean(),
    simulate_failure: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (!values.same_as_main) {
      if (values.line1.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['line1'],
          message: 'Address line 1 is required',
        });
      }
      if (values.city.length < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['city'], message: 'City is required' });
      }
      if (values.state.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['state'],
          message: 'State is required',
        });
      }
      if (!PINCODE_RE.test(values.pincode)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['pincode'],
          message: 'Enter a valid pincode',
        });
      }
    }
    if (values.billing_email !== '' && !EMAIL_CHECK.safeParse(values.billing_email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['billing_email'],
        message: 'Enter a valid email',
      });
    }
    if (values.has_gstin && values.gstin !== '' && !GSTIN_RE.test(values.gstin.toUpperCase())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['gstin'],
        message: 'Enter a valid GSTIN',
      });
    }
  });

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
