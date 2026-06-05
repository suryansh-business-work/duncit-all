import { z } from 'zod';

/** Payment methods offered at checkout — mirrors mWeb's CHECKOUT_PAYMENT_METHODS. */
export const CHECKOUT_PAYMENT_METHODS = [
  { value: 'DUMMY_UPI', label: 'UPI (Dummy)' },
  { value: 'DUMMY_CARD', label: 'Credit / Debit Card (Dummy)' },
  { value: 'DUMMY_NETBANKING', label: 'Net Banking (Dummy)' },
  { value: 'GOOGLE_PAY', label: 'Google Pay' },
] as const;

const METHOD_VALUES = CHECKOUT_PAYMENT_METHODS.map((m) => m.value) as [string, ...string[]];

/** Checkout contact + payment contract — RN twin of mWeb's checkoutFormSchema. */
export const checkoutSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email').max(254),
  phone_extension: z
    .string()
    .trim()
    .regex(/^\+?\d{1,5}$/, 'Use a code like +91'),
  phone_number: z
    .string()
    .trim()
    .regex(/^\d{6,15}$/, 'Enter a valid phone number'),
  billing_address: z.string().trim().min(8, 'Billing address is too short').max(500, 'Too long'),
  method: z.enum(METHOD_VALUES),
  simulate_failure: z.boolean(),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const checkoutDefaults: CheckoutFormValues = {
  email: '',
  phone_extension: '+91',
  phone_number: '',
  billing_address: '',
  method: 'DUMMY_UPI',
  simulate_failure: false,
};
