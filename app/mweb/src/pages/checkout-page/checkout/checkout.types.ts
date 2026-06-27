import { z } from 'zod';
import type { CheckoutForm } from '../queries';

export const PHONE_NUMBER_PATTERN = /^\d{6,15}$/;
export const PHONE_EXTENSION_PATTERN = /^\+?\d{1,5}$/;

/**
 * Checkout contact contract — RHF + Zod (migrated from Formik + Yup). Mirrors the
 * previous yup `checkoutFormSchema`: email + phone code/number + a billing address
 * (8–500 chars) plus the dummy-gateway `simulate_failure` flag.
 */
export const checkoutSchema = z.object({
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
  billing_address: z
    .string()
    .trim()
    .min(8, 'Billing address must be at least 8 characters')
    .max(500, 'Billing address must be 500 characters or fewer'),
  simulate_failure: z.boolean(),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export const checkoutDefaults: CheckoutForm = {
  email: '',
  phone_extension: '+91',
  phone_number: '',
  billing_address: '',
  simulate_failure: false,
};

/** Normalises submitted values into the contact payload sent to the server.
 * Email is lowercased to match the previous yup `.lowercase()` cast. */
export function toCheckoutContact(values: CheckoutForm) {
  return {
    contact_email: values.email.trim().toLowerCase(),
    contact_phone_extension: values.phone_extension.trim(),
    contact_phone_number: values.phone_number.trim(),
    billing_address: values.billing_address.trim(),
    simulate_failure: values.simulate_failure,
  };
}
