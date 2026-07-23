import * as yup from 'yup';

const phoneNumberRegex = /^\d{6,15}$/;
const phoneExtensionRegex = /^\+?\d{1,5}$/;
const gstinRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]{2}$/;

// Structured billing address entered at checkout (may differ from the main
// address). line1/city/state/pincode are the minimum for a valid tax invoice.
export const checkoutBillingSchema = yup.object({
  email: yup.string().trim().email('Enter a valid billing email').max(254).optional(),
  gstin: yup
    .string()
    .trim()
    .uppercase()
    .matches(gstinRegex, { message: 'Enter a valid 15-character GSTIN', excludeEmptyString: true })
    .optional(),
  line1: yup.string().trim().min(3, 'Address line 1 is required').max(200).required('Address line 1 is required'),
  line2: yup.string().trim().max(200).optional(),
  landmark: yup.string().trim().max(160).optional(),
  city: yup.string().trim().min(1, 'City is required').max(120).required('City is required'),
  state: yup.string().trim().min(1, 'State is required').max(120).required('State is required'),
  pincode: yup.string().trim().matches(/^\d{4,10}$/, 'Enter a valid pincode').required('Pincode is required'),
  country: yup.string().trim().max(80).default('India'),
});

export const dummyCheckoutSchema = yup.object({
  pod_id: yup.string().trim().nullable().default(null),
  amount: yup.number().typeError('Amount must be a number').moreThan(0).required(),
  description: yup.string().trim().max(300).default('Booking'),
  contact_name: yup.string().trim().max(160).optional(),
  contact_email: yup.string().trim().email().required('Email is required'),
  contact_phone: yup.string().trim().max(32).optional(),
  contact_phone_extension: yup.string().trim().matches(phoneExtensionRegex, 'Phone code is invalid').required('Phone code is required'),
  contact_phone_number: yup.string().trim().matches(phoneNumberRegex, 'Phone must contain only digits (6-15 digits)').required('Phone is required'),
  // Structured billing is preferred; the legacy free-text field stays accepted
  // (optional) so older clients keep working during the rollout.
  billing: checkoutBillingSchema.optional().default(undefined),
  billing_address: yup.string().trim().max(500).optional(),
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
  // Kept as pass-through (lenient) shapes so stripUnknown doesn't drop them —
  // sub-fields are already enforced by the GraphQL input types.
  selected_products: yup.array().optional().default(undefined),
  fulfilment_method: yup.string().oneOf(['SHIP', 'PICKUP']).default('PICKUP'),
  shipping_address: yup.object().nullable().default(null),
}).test(
  'has-billing',
  'A billing address is required',
  (v) => !!(v.billing?.line1 || (v.billing_address && v.billing_address.trim().length >= 8))
);

export type DummyCheckoutDTO = yup.InferType<typeof dummyCheckoutSchema>;

/** Live Razorpay order — same contact/billing fields as the dummy flow. */
export const razorpayOrderSchema = dummyCheckoutSchema.omit(['simulate_failure']);

export const verifyRazorpaySchema = yup.object({
  payment_doc_id: yup.string().trim().required('Payment is required'),
  razorpay_order_id: yup.string().trim().required('Order id is required'),
  razorpay_payment_id: yup.string().trim().required('Payment id is required'),
  razorpay_signature: yup.string().trim().required('Signature is required'),
});

const pincodeRegex = /^\d{4,10}$/;

// Standalone product-cart checkout (no pod ticket). `items` sub-fields are
// enforced by the GraphQL input type; the array itself just can't be empty.
export const dummyProductCheckoutSchema = yup.object({
  items: yup.array().min(1, 'Your cart is empty').required('Items are required'),
  description: yup.string().trim().max(300).default('Product order'),
  contact_name: yup.string().trim().max(160).optional(),
  contact_email: yup.string().trim().email().required('Email is required'),
  contact_phone: yup.string().trim().max(32).optional(),
  contact_phone_extension: yup.string().trim().matches(phoneExtensionRegex, 'Phone code is invalid').required('Phone code is required'),
  contact_phone_number: yup.string().trim().matches(phoneNumberRegex, 'Phone must contain only digits (6-15 digits)').required('Phone is required'),
  billing: checkoutBillingSchema.optional().default(undefined),
  billing_address: yup.string().trim().max(500).optional(),
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
  fulfilment_method: yup.string().oneOf(['SHIP', 'PICKUP']).default('PICKUP'),
  shipping_address: yup.object().nullable().default(null),
  delivery_pincode: yup
    .string()
    .trim()
    .matches(pincodeRegex, { message: 'Enter a valid pincode', excludeEmptyString: true })
    .nullable()
    .default(null),
  simulate_failure: yup.boolean().default(false),
}).test(
  'has-billing',
  'A billing address is required',
  (v) => !!(v.billing?.line1 || (v.billing_address && v.billing_address.trim().length >= 8))
);

export type DummyProductCheckoutDTO = yup.InferType<typeof dummyProductCheckoutSchema>;

/** Live Razorpay product order — same fields as the dummy flow, no simulate_failure. */
export const productCheckoutSchema = dummyProductCheckoutSchema.omit(['simulate_failure']);

export const productShippingQuoteSchema = yup.object({
  items: yup.array().min(1, 'Your cart is empty').required('Items are required'),
  delivery_pincode: yup.string().trim().matches(pincodeRegex, 'Enter a valid pincode').required('Delivery pincode is required'),
});