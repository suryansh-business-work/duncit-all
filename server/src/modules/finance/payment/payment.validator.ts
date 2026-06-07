import * as yup from 'yup';

const phoneNumberRegex = /^\d{6,15}$/;
const phoneExtensionRegex = /^\+?\d{1,5}$/;

export const dummyCheckoutSchema = yup.object({
  pod_id: yup.string().trim().nullable().default(null),
  amount: yup.number().typeError('Amount must be a number').moreThan(0).required(),
  description: yup.string().trim().max(300).default('Booking'),
  contact_email: yup.string().trim().email().required('Email is required'),
  contact_phone: yup.string().trim().max(32).optional(),
  contact_phone_extension: yup.string().trim().matches(phoneExtensionRegex, 'Phone code is invalid').required('Phone code is required'),
  contact_phone_number: yup.string().trim().matches(phoneNumberRegex, 'Phone must contain only digits (6-15 digits)').required('Phone is required'),
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
  coupon_code: yup.string().trim().max(40).nullable().default(null),
  simulate_failure: yup.boolean().default(false),
});

export type DummyCheckoutDTO = yup.InferType<typeof dummyCheckoutSchema>;

/** Live Razorpay order — same contact/billing fields as the dummy flow. */
export const razorpayOrderSchema = dummyCheckoutSchema.omit(['simulate_failure']);

export const verifyRazorpaySchema = yup.object({
  payment_doc_id: yup.string().trim().required('Payment is required'),
  razorpay_order_id: yup.string().trim().required('Order id is required'),
  razorpay_payment_id: yup.string().trim().required('Payment id is required'),
  razorpay_signature: yup.string().trim().required('Signature is required'),
});