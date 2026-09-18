import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { isEmailAddress } from '@utils/email';
import { UserModel } from '@modules/access/user/user.model';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { PaymentModel, type IPayment } from '@modules/finance/payment/payment.model';
import { COD_GATEWAY } from '@modules/finance/payment/payment.finalize';
import {
  buildBuyerFields,
  freeSettlement,
  newPaymentId,
  razorpaySheet,
  settle,
  toPub,
  verifyRazorpayAndSettle,
} from '@modules/finance/payment/payment.service';
import { createRazorpayOrder, getRazorpayKeys } from '@modules/finance/payment/razorpay.gateway';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { otpService } from '@modules/platform/otp/otp.service';
import { StoreCartModel } from './storeCart.model';
import { getStoreSettings, type IStoreSettings } from './storeSettings.model';
import { storeCartService } from './store.cart.service';
import { assertBuyable, lineOut, priceStoreCart, resolveStoreLines, type StoreQuote } from './store.pricing';
import { toStoreOrder } from './store.order.mapper';
import { autoshipDiscountFor } from './store.autoship.discount';
import { badInput, forbidden, notFound, resolveOwner, sameSecret, secretKey, type StoreOwner } from './store.shared';

/**
 * Turning a cart into orders. One path for every way of paying:
 *
 *  - Razorpay: a PENDING payment + a Razorpay order; the storefront opens the
 *    sheet and comes back through `verify`.
 *  - Dummy mode (Finance's test switch): captured on the spot.
 *  - Nothing left to charge (coupon / coins cover it): settled with no gateway.
 *  - Cash on Delivery: booked now, with the phone proven by a one-time code;
 *    the payment stays PENDING until the courier reports delivery.
 *
 * Whatever the path, the payment carries `metadata.store`, and the SAME
 * finalizer the pod shop uses creates the orders, moves the stock, spends the
 * coins and the coupon, and books the ShipRocket shipment.
 */

export type StoreCheckoutMethod = 'ONLINE' | 'COD';

interface ContactInput {
  name: string;
  email: string;
  phone_extension: string;
  phone_number: string;
}

interface AddressInput {
  name: string;
  phone: string;
  email?: string | null;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  pincode: string;
  country?: string | null;
}

export interface StoreQuoteArgs {
  cart_token?: string | null;
  pincode?: string | null;
  payment_method?: StoreCheckoutMethod | null;
  coupon_code?: string | null;
  redeem_coins?: number | null;
  email?: string | null;
  /** Checkout that came from an Autoship "Order now" — earns the autoship discount. */
  autoship_id?: string | null;
}

export interface StorePlaceOrderArgs extends StoreQuoteArgs {
  contact: ContactInput;
  shipping_address: AddressInput;
  billing_same_as_shipping?: boolean | null;
  billing_address?: AddressInput | null;
  gstin?: string | null;
  cod_challenge_id?: string | null;
  checkout_url?: string | null;
}

const PHONE = /^\d{10}$/;
const PINCODE = /^\d{6}$/;

function assertStoreOpen(settings: IStoreSettings) {
  if (!settings.store_enabled) {
    throw new GraphQLError('The store is not taking orders right now', {
      extensions: { code: 'STORE_CLOSED' },
    });
  }
}

function assertCheckoutAllowed(ctx: GraphQLContext, settings: IStoreSettings) {
  if (ctx.user || settings.guest_checkout_enabled) return;
  throw new GraphQLError('Sign in to check out', { extensions: { code: 'UNAUTHENTICATED' } });
}

export function cleanAddress(a: AddressInput) {
  const out = {
    name: String(a?.name ?? '').trim(),
    phone: String(a?.phone ?? '').replaceAll(/\D/g, '').slice(-10),
    email: String(a?.email ?? '').trim().toLowerCase(),
    line1: String(a?.line1 ?? '').trim(),
    line2: String(a?.line2 ?? '').trim(),
    landmark: String(a?.landmark ?? '').trim(),
    city: String(a?.city ?? '').trim(),
    state: String(a?.state ?? '').trim(),
    pincode: String(a?.pincode ?? '').replaceAll(/\D/g, ''),
    country: String(a?.country ?? '').trim() || 'India',
  };
  if (!out.name) badInput('Enter the name to deliver to');
  if (!PHONE.test(out.phone)) badInput('Enter a 10-digit phone number for delivery');
  if (!out.line1) badInput('Enter the delivery address');
  if (!out.city || !out.state) badInput('Enter the city and state');
  if (!PINCODE.test(out.pincode)) badInput('Enter a valid 6-digit pincode');
  return out;
}

export function cleanContact(c: ContactInput) {
  const out = {
    name: String(c?.name ?? '').trim(),
    email: String(c?.email ?? '').trim().toLowerCase(),
    phone_extension: String(c?.phone_extension ?? '').trim() || '+91',
    phone_number: String(c?.phone_number ?? '').replaceAll(/\D/g, ''),
  };
  if (!out.name) badInput('Enter your name');
  if (!isEmailAddress(out.email)) badInput('Enter a valid email address');
  if (!PHONE.test(out.phone_number)) badInput('Enter a valid 10-digit mobile number');
  return out;
}

async function loadCart(owner: StoreOwner) {
  const cart = await StoreCartModel.findOne({ owner_key: owner.owner_key });
  if (!cart || cart.items.length === 0) badInput('Your cart is empty');
  return cart;
}

async function priceFor(ctx: GraphQLContext, args: StoreQuoteArgs, settings: IStoreSettings, strict: boolean) {
  const owner = resolveOwner(ctx, args.cart_token);
  const cart = await loadCart(owner);
  const lines = await resolveStoreLines(cart.items, settings);
  if (strict) assertBuyable(lines);
  const quote = await priceStoreCart({
    lines,
    settings,
    pincode: String(args.pincode ?? '').replaceAll(/\D/g, ''),
    paymentMethod: args.payment_method === 'COD' ? 'COD' : 'PREPAID',
    couponCode: args.coupon_code ?? cart.coupon_code,
    redeemCoins: args.redeem_coins,
    userId: ctx.user?.id ?? null,
    email: args.email ?? cart.email,
    autoship: await autoshipDiscountFor(ctx.user?.id ?? null, args.autoship_id, settings),
  });
  return { owner, cart, quote };
}

const quoteOut = (q: StoreQuote, currencySymbol: string) => ({
  lines: q.lines.map(lineOut),
  items_total: q.items_total,
  mrp_total: q.mrp_total,
  savings: q.savings,
  coupon_code: q.coupon_code ?? '',
  coupon_discount: q.coupon_discount,
  coupon_error: q.coupon_error,
  prepaid_discount: q.prepaid_discount,
  autoship_discount: q.autoship_discount,
  shipping_total: q.shipping.total,
  shipping_quoted: q.shipping.all_quoted,
  serviceable: q.shipping.serviceable,
  etd: q.shipping.etd,
  cod_fee: q.cod_fee,
  coins_redeemed: q.coins_redeemed,
  discount_total: q.discount_total,
  gst_amount: q.quote.gst_amount,
  total: q.quote.total,
  currency_symbol: currencySymbol,
  cod_available: q.cod_block === null,
  cod_block: q.cod_block,
  below_minimum: q.below_minimum,
  has_issues: q.lines.some((l) => l.issue),
});

/** Spend the COD phone proof: verified, unused, and for THIS number. */
export async function consumeCodProof(challengeId: string | null | undefined, phone: string) {
  if (!challengeId) badInput('Verify your phone number to place a Cash on Delivery order');
  await otpService.consume(challengeId, {
    purpose: 'STORE_COD',
    match: (c) => String(c.phone_number ?? '').replaceAll(/\D/g, '').endsWith(phone),
  });
}

/** Everything the finalizer and the order split need, frozen on the payment. */
function storeMetadata(
  quote: StoreQuote,
  where: { checkoutUrl: string; pincode: string },
  extra: Record<string, unknown>
) {
  return {
    source: 'store_checkout',
    checkout_url: where.checkoutUrl,
    pod_id: null,
    ticket_amount: null,
    product_cost_total: quote.items_total,
    selected_products: quote.lines.map((l) => ({
      product_id: l.product_id,
      variant_id: l.variant_id,
      quantity: l.quantity,
    })),
    product_lines: quote.lines,
    fulfilment_method: 'SHIP',
    delivery_pincode: where.pincode,
    shipping: { total: quote.shipping.total, breakup: quote.shipping.breakup, all_quoted: quote.shipping.all_quoted },
    original_total: quote.original_total,
    ...extra,
  };
}

/** The payer's identity + billing snapshot, through the checkout's one builder. */
async function buyerFor(ctx: GraphQLContext, contact: ReturnType<typeof cleanContact>, args: StorePlaceOrderArgs) {
  const user = ctx.user ? await UserModel.findById(ctx.user.id) : null;
  const billingSource = args.billing_same_as_shipping === false && args.billing_address ? args.billing_address : args.shipping_address;
  const billing = {
    line1: billingSource.line1,
    line2: billingSource.line2 ?? '',
    landmark: billingSource.landmark ?? '',
    city: billingSource.city,
    state: billingSource.state,
    pincode: billingSource.pincode,
    country: billingSource.country ?? 'India',
    email: contact.email,
    gstin: String(args.gstin ?? '').trim(),
  };
  return {
    user,
    fields: buildBuyerFields(
      {
        contact_name: contact.name,
        contact_email: contact.email,
        contact_phone_extension: contact.phone_extension,
        contact_phone_number: contact.phone_number,
        billing,
      },
      user ?? {}
    ),
  };
}

export type CleanAddress = ReturnType<typeof cleanAddress>;

/** Everything a store payment document is created from, before a gateway is chosen. */
export interface StorePaymentDraft {
  base: Record<string, unknown>;
  metadata: Record<string, unknown>;
  accessKey: string;
  ownerKey: string;
}

/**
 * The payment row for a priced basket: who pays, the quote's money, and the
 * `metadata.store` facts the finalizer's order split reads. Shared by the
 * checkout and by an Autoship cycle, so both write the same shape.
 */
export function draftStorePayment(input: {
  userId: unknown;
  buyerFields: Record<string, unknown>;
  quote: StoreQuote;
  method: StoreCheckoutMethod;
  ownerKey: string;
  address: CleanAddress;
  checkoutUrl: string;
  description: string;
  extraFacts?: Record<string, unknown>;
}): StorePaymentDraft {
  const { quote } = input;
  const q = quote.quote;
  const accessKey = secretKey();
  const base = {
    payment_id: newPaymentId(),
    invoice_no: null,
    user_id: input.userId ?? null,
    ...input.buyerFields,
    checkout_url: input.checkoutUrl,
    target_type: 'PRODUCT',
    pod_id: null,
    description: input.description,
    subtotal: q.subtotal,
    platform_fee_pct: q.platform_fee_pct,
    platform_fee_amount: q.platform_fee_amount,
    gst_pct: q.gst_pct,
    gst_amount: q.gst_amount,
    total: q.total,
    currency_symbol: q.currency_symbol,
    coupon_code: quote.coupon_code,
    coupon_discount: quote.coupon_discount,
    coins_redeemed: quote.coins_redeemed,
    paid_at: null,
  };
  const store = {
    channel: 'PET_STORE',
    payment_method: input.method === 'COD' ? 'COD' : 'PREPAID',
    discount_total: quote.discount_total,
    coupon_discount: quote.coupon_discount,
    prepaid_discount: quote.prepaid_discount,
    autoship_discount: quote.autoship_discount,
    cod_fee: quote.cod_fee,
    mrp_total: quote.mrp_total,
    access_key: accessKey,
    cart_owner_key: input.ownerKey,
    ...input.extraFacts,
  };
  const metadata = storeMetadata(
    quote,
    { checkoutUrl: input.checkoutUrl, pincode: input.address.pincode },
    { shipping_address: input.address, store }
  );
  return { base, metadata, accessKey, ownerKey: input.ownerKey };
}

/** Book a Cash-on-Delivery order: no money moves, the finalizer creates the orders. */
export async function bookCodPayment(draft: StorePaymentDraft, component: string) {
  const doc = await PaymentModel.create({
    ...draft.base,
    status: 'PENDING',
    gateway: COD_GATEWAY,
    gateway_ref: `cod_${Date.now()}`,
    metadata: draft.metadata,
  });
  await settle(String(doc._id), 'Cash on delivery', component);
  return (await PaymentModel.findById(doc._id))!;
}

export const describeBasket = (count: number) => `Pet store order · ${count} item${count === 1 ? '' : 's'}`;

/** The checks a priced basket must pass before any payment row is written. */
async function assertPlaceable(
  settings: IStoreSettings,
  quote: StoreQuote,
  args: StorePlaceOrderArgs,
  method: StoreCheckoutMethod,
  phone: string
) {
  if (quote.below_minimum) badInput(`The minimum order value is ${settings.min_order_value}`);
  if (!quote.shipping.serviceable) badInput('We cannot deliver to this pincode yet');
  if (quote.coupon_error && (args.coupon_code ?? '').trim()) badInput(quote.coupon_error);
  if (method !== 'COD') return;
  if (quote.cod_block) badInput('Cash on Delivery is not available for this order');
  if (settings.cod_requires_otp) await consumeCodProof(args.cod_challenge_id, phone);
}

/** Captured on the spot: a zero-charge basket, or Finance's dummy mode. */
async function settleInstantly(draft: StorePaymentDraft, quote: StoreQuote) {
  const settlement =
    quote.quote.total <= 0 ? freeSettlement(quote.coupon_code) : { gateway: 'DUMMY', label: 'Dummy Gateway' };
  const doc = await PaymentModel.create({
    ...draft.base,
    status: 'PENDING',
    gateway: settlement.gateway,
    gateway_ref: `${settlement.gateway.toLowerCase()}_${Date.now()}`,
    metadata: draft.metadata,
  });
  await settle(String(doc._id), settlement.label, 'storePlaceOrder');
  return (await PaymentModel.findById(doc._id))!;
}

/** A PENDING payment plus the Razorpay sheet the storefront opens. */
async function openRazorpay(
  draft: StorePaymentDraft,
  quote: StoreQuote,
  contact: ReturnType<typeof cleanContact>,
  businessName: string
) {
  const { keyId } = await getRazorpayKeys();
  const q = quote.quote;
  const amountPaise = Math.round(q.total * 100);
  const order = await createRazorpayOrder({
    amountPaise,
    currency: 'INR',
    receipt: String(draft.base.payment_id),
    notes: { kind: 'pet_store', user_id: draft.base.user_id ? String(draft.base.user_id) : 'guest' },
  });
  const doc = await PaymentModel.create({
    ...draft.base,
    status: 'PENDING',
    gateway: 'RAZORPAY',
    gateway_ref: order.id,
    metadata: { ...draft.metadata, razorpay_order_id: order.id },
  });
  const sheet = razorpaySheet({
    paymentDocId: String(doc._id),
    keyId,
    orderId: order.id,
    amountPaise,
    businessName,
    description: String(draft.base.description),
    input: { contact_email: contact.email, contact_phone_number: contact.phone_number },
    currencySymbol: q.currency_symbol,
    total: q.total,
    free: false,
    payment: null,
  });
  return { doc, sheet };
}

async function ordersFor(payment: IPayment) {
  const orders = await ProductOrderModel.find({ payment_id: payment._id }).sort({ created_at: 1 });
  return orders.map((o) => toStoreOrder(o, payment));
}

async function resultFor(payment: IPayment, status: string, accessKey: string, razorpay: unknown = null) {
  return {
    status,
    payment_doc_id: String(payment._id),
    payment_id: payment.payment_id,
    total: payment.total,
    currency_symbol: payment.currency_symbol,
    access_key: payment.user_id ? '' : accessKey,
    orders: await ordersFor(payment),
    razorpay,
  };
}

/** A converted cart starts over: empty, no coupon. */
async function markConverted(ownerKey: string, paymentId: unknown) {
  await StoreCartModel.updateOne(
    { owner_key: ownerKey },
    { $set: { items: [], coupon_code: '', converted_payment_id: paymentId, last_activity_at: new Date() } }
  );
}

/** Who may read or verify a store payment: its account, or the guest's cart / key. */
function assertPaymentAccess(ctx: GraphQLContext, payment: IPayment, token?: string | null, accessKey?: string | null) {
  const store = payment.metadata?.store;
  if (!store) notFound('Order not found');
  if (payment.user_id) {
    if (ctx.user?.id && String(payment.user_id) === String(ctx.user.id)) return;
    forbidden('Sign in with the account that placed this order');
  }
  if (accessKey && sameSecret(accessKey, String(store.access_key ?? ''))) return;
  if (token && `g:${String(token).trim()}` === store.cart_owner_key) return;
  forbidden('This order link is not valid');
}

export const storeCheckoutService = {
  async quote(ctx: GraphQLContext, args: StoreQuoteArgs) {
    const settings = await getStoreSettings();
    const { quote } = await priceFor(ctx, args, settings, false);
    const fs = await getFinanceSettings();
    return quoteOut(quote, fs.currency_symbol);
  },

  /** Send the COD phone code. Allowed only with a non-empty cart, and the OTP
   * service's own resend cooldown throttles repeats to one number. */
  async requestCodOtp(ctx: GraphQLContext, cartToken: string | null | undefined, extension: string, phone: string) {
    const settings = await getStoreSettings();
    assertStoreOpen(settings);
    if (!settings.cod_enabled) badInput('Cash on Delivery is not available');
    const owner = resolveOwner(ctx, cartToken);
    // A guest must hold a cart to be texted a code; a signed-in buyer may be
    // proving the phone for an Autoship subscription instead.
    if (!ctx.user) await loadCart(owner);
    const number = String(phone ?? '').replaceAll(/\D/g, '');
    if (!PHONE.test(number)) badInput('Enter a valid 10-digit mobile number');
    const result = await otpService.request({
      purpose: 'STORE_COD',
      mediums: ['SMS', 'WHATSAPP'],
      phone_extension: String(extension ?? '').trim() || '+91',
      phone_number: number,
      context: { owner_key: owner.owner_key },
      requested_by: ctx.user?.id ?? null,
    });
    return {
      challenge_id: result.challenge_id,
      expires_at: result.expires_at,
      resend_after_seconds: result.resend_after_seconds,
      test_code: result.test_code,
    };
  },

  async verifyCodOtp(challengeId: string, code: string) {
    await otpService.verify(challengeId, code);
    return true;
  },

  async place(ctx: GraphQLContext, args: StorePlaceOrderArgs) {
    const settings = await getStoreSettings();
    assertStoreOpen(settings);
    assertCheckoutAllowed(ctx, settings);
    const contact = cleanContact(args.contact);
    const address = cleanAddress(args.shipping_address);
    const method: StoreCheckoutMethod = args.payment_method === 'COD' ? 'COD' : 'ONLINE';
    const { owner, quote } = await priceFor(
      ctx,
      { ...args, pincode: address.pincode, email: contact.email },
      settings,
      true
    );
    await assertPlaceable(settings, quote, args, method, contact.phone_number);
    await storeCartService.rememberContact(owner, contact.email, contact.phone_number);

    const { user, fields } = await buyerFor(ctx, contact, { ...args, shipping_address: address });
    const draft = draftStorePayment({
      userId: user?._id ?? null,
      buyerFields: fields,
      quote,
      method,
      ownerKey: owner.owner_key,
      address,
      checkoutUrl: args.checkout_url ?? '',
      description: describeBasket(quote.lines.length),
      extraFacts: args.autoship_id ? { autoship_id: String(args.autoship_id) } : {},
    });

    if (method === 'COD') {
      const doc = await bookCodPayment(draft, 'storePlaceOrder');
      await markConverted(owner.owner_key, doc._id);
      return resultFor(doc, 'COD_CONFIRMED', draft.accessKey);
    }
    const fs = await getFinanceSettings();
    if (quote.quote.total <= 0 || fs.dummy_mode) {
      const doc = await settleInstantly(draft, quote);
      await markConverted(owner.owner_key, doc._id);
      return resultFor(doc, 'PAID', draft.accessKey);
    }
    const { doc, sheet } = await openRazorpay(draft, quote, contact, settings.store_name || fs.business_name);
    return resultFor(doc, 'PENDING_PAYMENT', draft.accessKey, sheet);
  },

  /** Step 2 of an online payment: the Razorpay sheet came back with a signature. */
  async verify(
    ctx: GraphQLContext,
    input: {
      payment_doc_id: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
      cart_token?: string | null;
      access_key?: string | null;
    }
  ) {
    const doc = await PaymentModel.findById(input.payment_doc_id);
    if (!doc) notFound('Payment not found');
    assertPaymentAccess(ctx, doc, input.cart_token, input.access_key);
    const pub = await verifyRazorpayAndSettle(doc, input, 'storeVerifyPayment');
    const store = doc.metadata?.store ?? {};
    await markConverted(String(store.cart_owner_key ?? ''), doc._id);
    const fresh = await PaymentModel.findById(doc._id);
    return resultFor(fresh!, pub.status === 'SUCCESS' ? 'PAID' : 'FAILED', String(store.access_key ?? ''));
  },

  /** The confirmation page's read: the payment and the orders it became. */
  async confirmation(ctx: GraphQLContext, paymentDocId: string, token?: string | null, accessKey?: string | null) {
    const doc = await PaymentModel.findById(paymentDocId);
    if (!doc) notFound('Order not found');
    assertPaymentAccess(ctx, doc, token, accessKey);
    const store = doc.metadata?.store ?? {};
    let status = 'PENDING_PAYMENT';
    if (doc.gateway === COD_GATEWAY) status = 'COD_CONFIRMED';
    else if (doc.status === 'SUCCESS') status = 'PAID';
    else if (doc.status === 'FAILED') status = 'FAILED';
    return resultFor(doc, status, String(store.access_key ?? ''));
  },

  toPub,
};
