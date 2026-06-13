import { z } from 'zod';

/** Checkout contact + payment contract — RN twin of mWeb's checkoutFormSchema.
 * Payment-method selection is handled by Razorpay's own sheet, so there is no
 * in-app method picker. */
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
  simulate_failure: z.boolean(),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const checkoutDefaults: CheckoutFormValues = {
  email: '',
  phone_extension: '+91',
  phone_number: '',
  billing_address: '',
  simulate_failure: false,
};
