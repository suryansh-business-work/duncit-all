import * as yup from 'yup';

export const dummyCheckoutSchema = yup.object({
  pod_id: yup.string().trim().nullable().default(null),
  amount: yup.number().typeError('Amount must be a number').moreThan(0).required(),
  description: yup.string().trim().max(300).default('Booking'),
  contact_email: yup.string().trim().email().required('Email is required'),
  contact_phone: yup.string().trim().min(6).max(32).required('Phone is required'),
  billing_address: yup.string().trim().min(8).max(500).required('Address is required'),
  checkout_url: yup
    .string()
    .trim()
    .max(2048)
    .required('Checkout URL is required')
    .test('is-url', 'checkout_url must be a valid URL', (val) => {
      if (!val) return false;
      try { new URL(val); return true; } catch { return false; }
    }),
  simulate_failure: yup.boolean().default(false),
});

export type DummyCheckoutDTO = yup.InferType<typeof dummyCheckoutSchema>;