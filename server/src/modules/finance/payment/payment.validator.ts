import { z } from 'zod';
import { PHONE_EXTENSION_REGEX, PHONE_NUMBER_REGEX } from '@utils/phone';
import {
  arr,
  bool,
  email,
  filled,
  finite,
  gt,
  gte,
  int,
  matches,
  maxLen,
  minItems,
  minLen,
  num,
  obj,
  shape,
  str,
  trim,
  uppercase,
  type ShapeOptions,
} from '@utils/zod-fields';

const phoneNumberRegex = PHONE_NUMBER_REGEX;
const phoneExtensionRegex = PHONE_EXTENSION_REGEX;
const gstinRegex = /^\d{2}[A-Z]{5}\d{4}[A-Z][0-9A-Z]{2}$/;
const pincodeRegex = /^\d{4,10}$/;

const FULFILMENT_METHODS = ['SHIP', 'PICKUP'] as const;
const GIFT_CARD_SCOPES = ['SHOP', 'SUPER', 'CATEGORY', 'SUB'] as const;

const trimmedUpTo = (max: number) => str(z.string().check(maxLen(max)).optional(), { transforms: [trim] });
const nullableText = (max?: number) =>
  str(z.string().check(...(max ? [maxLen(max)] : [])).nullable(), { transforms: [trim], default: null });
const blankOr = (pattern: RegExp, message: string) =>
  str(z.string().check(matches(pattern, { message, excludeEmptyString: true })).optional(), { transforms: [trim] });
const required = (message: string, ...checks: z.core.$ZodCheck<string>[]) =>
  str(z.string().check(...checks, filled(message)), { required: message, transforms: [trim] });

// Only the buyer's email is mandatory at checkout: a half-filled profile must
// never block a payment. Phone parts keep their format rules when sent.
const optionalPhoneExtension = () => blankOr(phoneExtensionRegex, 'Phone code is invalid');
const optionalPhoneNumber = () => blankOr(phoneNumberRegex, 'Phone must contain only digits (6-15 digits)');

const optionalBillingFields = {
  email: str(z.string().check(email('Enter a valid billing email'), maxLen(254)).optional(), { transforms: [trim] }),
  gstin: str(
    z.string().check(matches(gstinRegex, { message: 'Enter a valid 15-character GSTIN', excludeEmptyString: true })).optional(),
    { transforms: [trim, uppercase] }
  ),
  line1: trimmedUpTo(200),
  line2: trimmedUpTo(200),
  landmark: trimmedUpTo(160),
  city: trimmedUpTo(120),
  state: trimmedUpTo(120),
  pincode: blankOr(pincodeRegex, 'Enter a valid pincode'),
  country: str(z.string().check(maxLen(80)), { transforms: [trim], default: 'India' }),
};

// Base structured billing shape. Optional fields live here; the mandatory
// invoice fields are added by checkoutBillingSchema below.
export const optionalCheckoutBillingSchema = obj(shape(optionalBillingFields));

// Every payment needs a real invoice address; deliveries reuse it for shipping.
const checkoutBillingShape = shape({
  ...optionalBillingFields,
  line1: required('Address line 1 is required', minLen(3, 'Address line 1 is required'), maxLen(200)),
  city: required('City is required', minLen(1, 'City is required'), maxLen(120)),
  state: required('State is required', minLen(1, 'State is required'), maxLen(120)),
  pincode: required('Pincode is required', matches(pincodeRegex, 'Enter a valid pincode')),
});

export const checkoutBillingSchema = obj(checkoutBillingShape);

type BillingCarrier = {
  billing?: { line1?: string | null } | null;
  billing_address?: string | null;
};

/** Structured billing is preferred; legacy one-line billing remains accepted
 * for older clients during the rollout. Every payment still needs one. */
const hasBillingAddress = (value: BillingCarrier | null | undefined) =>
  !!(value?.billing?.line1?.trim() || (value?.billing_address?.trim().length ?? 0) >= 8);

const BILLING_REQUIRED = 'A billing address is required';
const billingRule: ShapeOptions<z.ZodRawShape> = {
  tests: [{ message: BILLING_REQUIRED, test: (value) => hasBillingAddress(value) }],
};

/**
 * Seats and coins are LENIENT on purpose, but they must be DECLARED.
 *
 * `validate()` drops every field the schema does not name — silently. That is
 * what charged a 4-seat booking for one seat and made coin redemption a no-op:
 * the client sent both, the GraphQL input declared both, and validation
 * dropped both.
 *
 * The real limits stay where they belong — `clampSeatsForPod` knows the pod's
 * remaining capacity and `applyCoins` knows the live balance — so these only
 * assert the shape.
 */
const optionalSeats = () => num(finite().check(int('Seats must be a whole number'), gte(1)).nullable(), { default: 1 });
const optionalRedeemCoins = () =>
  num(finite().check(int('Coins must be a whole number'), gte(0)).nullable(), { default: 0 });

const isUrl = (val: string) => {
  if (!val) return false;
  try {
    new URL(val);
    return true;
  } catch {
    return false;
  }
};

const amount = () => num(finite().check(gt(0)), { typeError: 'Amount must be a number', required: true });
const contactEmail = () =>
  str(z.string().check(email(), filled('Email is required')), { required: 'Email is required', transforms: [trim] });
const checkoutUrl = () =>
  str(
    z
      .string()
      .check(maxLen(2048), filled('Checkout URL is required'))
      .refine(isUrl, 'checkout_url must be a valid URL'),
    { required: 'Checkout URL is required', transforms: [trim] }
  );
const optionalBilling = () => obj(checkoutBillingShape.optional(), { default: undefined });
const simulateFailure = () => bool(z.boolean(), { default: false });
const fulfilmentMethod = () => str(z.enum(FULFILMENT_METHODS), { oneOf: FULFILMENT_METHODS, default: 'PICKUP' });
// Every field of OrderShippingAddressInput must be declared here: a shape drops
// the keys it does not name, and an address stripped to `{}` reached ShipRocket
// as a blank ship-to that every pod-shop booking refused.
// GraphQL sends an omitted optional line as null, so each field accepts null too.
const addressText = (max: number) => str(z.string().check(maxLen(max)).nullish(), { transforms: [trim] });
const shippingAddress = () =>
  obj(
    shape({
      name: addressText(160),
      phone: addressText(32),
      email: addressText(254),
      line1: addressText(200),
      line2: addressText(200),
      landmark: addressText(200),
      city: addressText(120),
      state: addressText(120),
      pincode: addressText(10),
      country: addressText(80),
    }).nullable(),
    { default: null }
  );
const cartItems = () =>
  arr(z.array(z.unknown()).check(minItems(1, 'Your cart is empty')), { required: 'Items are required' });

/** Who is paying — the same on every checkout. */
const contactFields = () => ({
  contact_name: trimmedUpTo(160),
  contact_email: contactEmail(),
  contact_phone: trimmedUpTo(32),
  contact_phone_extension: optionalPhoneExtension(),
  contact_phone_number: optionalPhoneNumber(),
  // Structured billing is preferred; the legacy free-text field stays accepted
  // (optional) so older clients keep working during the rollout.
  billing: optionalBilling(),
  billing_address: trimmedUpTo(500),
  checkout_url: checkoutUrl(),
});

const podCheckoutHead = {
  pod_id: nullableText(),
  amount: amount(),
  seats: optionalSeats(),
  redeem_coins: optionalRedeemCoins(),
  description: str(z.string().check(maxLen(300)), { transforms: [trim], default: 'Booking' }),
  ...contactFields(),
  coupon_code: nullableText(40),
};

const podCheckoutTail = {
  selected_products: arr(z.array(z.unknown()).optional(), { default: undefined }),
  fulfilment_method: fulfilmentMethod(),
  shipping_address: shippingAddress(),
};

export const dummyCheckoutSchema = obj(
  shape({ ...podCheckoutHead, simulate_failure: simulateFailure(), ...podCheckoutTail }, billingRule)
);

export type DummyCheckoutDTO = z.infer<typeof dummyCheckoutSchema>;

/** Live Razorpay order — same contact/billing fields as the dummy flow. */
export const razorpayOrderSchema = obj(shape({ ...podCheckoutHead, ...podCheckoutTail }, billingRule));

export const verifyRazorpaySchema = obj(
  shape({
    payment_doc_id: required('Payment is required'),
    razorpay_order_id: required('Order id is required'),
    razorpay_payment_id: required('Payment id is required'),
    razorpay_signature: required('Signature is required'),
  })
);

// Standalone product-cart checkout (no pod ticket). `items` sub-fields are
// enforced by the GraphQL input type; the array itself just can't be empty.
const productCheckoutFields = {
  items: cartItems(),
  redeem_coins: optionalRedeemCoins(),
  description: str(z.string().check(maxLen(300)), { transforms: [trim], default: 'Product order' }),
  ...contactFields(),
  coupon_code: nullableText(40),
  fulfilment_method: fulfilmentMethod(),
  shipping_address: shippingAddress(),
  delivery_pincode: str(
    z.string().check(matches(pincodeRegex, { message: 'Enter a valid pincode', excludeEmptyString: true })).nullable(),
    { transforms: [trim], default: null }
  ),
};

const productBillingRule: ShapeOptions<z.ZodRawShape> = {
  tests: [
    {
      message: BILLING_REQUIRED,
      test: (value) => {
        const v = value as BillingCarrier;
        return !!(v.billing?.line1 || (v.billing_address && v.billing_address.trim().length >= 8));
      },
    },
  ],
};

export const dummyProductCheckoutSchema = obj(
  shape({ ...productCheckoutFields, simulate_failure: simulateFailure() }, productBillingRule)
);

export type DummyProductCheckoutDTO = z.infer<typeof dummyProductCheckoutSchema>;

/** Live Razorpay product order — same fields as the dummy flow, no simulate_failure. */
export const productCheckoutSchema = obj(shape(productCheckoutFields, productBillingRule));

export const productShippingQuoteSchema = obj(
  shape({
    items: cartItems(),
    delivery_pincode: required('Delivery pincode is required', matches(pincodeRegex, 'Enter a valid pincode')),
  })
);

// Gift card purchase. The scope/amount limits live in giftcardService
// (purchaseFacts knows the configured min/max and the category levels) — this
// only asserts the shape, but every field MUST be declared or validation drops
// it before the service sees it.
const giftCardCheckoutFields = {
  scope_type: str(z.enum(GIFT_CARD_SCOPES), { oneOf: GIFT_CARD_SCOPES, required: true }),
  scope_category_id: nullableText(),
  amount: amount(),
  recipient_email: str(z.string().check(email('Enter a valid recipient email'), maxLen(254)).nullable(), {
    transforms: [trim],
    default: null,
  }),
  recipient_name: nullableText(160),
  message: nullableText(300),
  ...contactFields(),
};

export const dummyGiftCardCheckoutSchema = obj(
  shape({ ...giftCardCheckoutFields, simulate_failure: simulateFailure() }, billingRule)
);

/** Live Razorpay gift card order — same fields, no simulate_failure. */
export const giftCardCheckoutSchema = obj(shape(giftCardCheckoutFields, billingRule));
