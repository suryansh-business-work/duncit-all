import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import crypto from 'node:crypto';
import { PaymentModel, type IPayment } from './payment.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { EcommBrandModel } from '@modules/venues/ecommBrand/ecommBrand.model';
import { UserModel } from '@modules/access/user/user.model';
import { getFinanceSettings, nextInvoiceNumber } from '@modules/finance/finance/finance.model';
import { invoiceDataForPayment } from './payment.invoice';
import { sendEmail } from '@services/email/email.service';
import { generateInvoicePdf } from '@services/invoice/invoice.pdf';
import { bookingLinkUrl, getUrlConfigs } from '@config/url-configs';
import {
  createRazorpayOrder,
  getRazorpayKeys,
  verifyRazorpaySignature,
} from './razorpay.gateway';
import { couponService } from '@modules/finance/coupon/coupon.service';
import { coinService } from '@modules/finance/coin/coin.service';
import { toPostalAddress, composeAddressLine, type PostalAddress } from '@utils/address';
import { maxSeatsForBooking, normalizeSeats } from '@modules/pods/pod/pod.seats';
import { claimSeats } from '@modules/pods/pod/pod.seats.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { logs } from '@observability/log';

const round2 = (n: number) => Math.round(n * 100) / 100;

const emptyBilling = () => ({
  name: '',
  email: '',
  phone: '',
  gstin: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
});

const toPub = (p: IPayment) => ({
  id: String(p._id),
  payment_id: p.payment_id,
  invoice_no: p.invoice_no,
  user_id: String(p.user_id),
  user_name: p.user_name,
  user_email: p.user_email,
  user_phone: p.user_phone,
  billing_address: p.billing_address ?? '',
  billing: { ...emptyBilling(), ...((p.billing as any)?.toObject?.() ?? p.billing) },
  checkout_url: p.checkout_url ?? '',
  target_type: p.target_type,
  pod_id: p.pod_id ? String(p.pod_id) : null,
  description: p.description,
  subtotal: p.subtotal,
  platform_fee_pct: p.platform_fee_pct,
  platform_fee_amount: p.platform_fee_amount,
  gst_pct: p.gst_pct,
  gst_amount: p.gst_amount,
  total: p.total,
  currency_symbol: p.currency_symbol,
  coupon_code: p.coupon_code ?? null,
  coupon_discount: p.coupon_discount ?? 0,
  coins_redeemed: p.coins_redeemed ?? 0,
  status: p.status,
  gateway: p.gateway,
  gateway_ref: p.gateway_ref,
  paid_at: p.paid_at ? p.paid_at.toISOString() : null,
  created_at: p.created_at.toISOString(),
  updated_at: p.updated_at.toISOString(),
});

/** Allowlists for the shared table engine (paymentsTable — DUNCIT TABLE CONTRACT v1). */
const PAYMENT_TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['payment_id', 'invoice_no', 'user_name', 'user_email'],
  sortFields: {
    payment_id: 'payment_id',
    invoice_no: 'invoice_no',
    user_name: 'user_name',
    user_email: 'user_email',
    description: 'description',
    subtotal: 'subtotal',
    platform_fee_amount: 'platform_fee_amount',
    gst_amount: 'gst_amount',
    total: 'total',
    status: 'status',
    gateway: 'gateway',
    paid_at: 'paid_at',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    target_type: { type: 'enum' },
    gateway: { type: 'string' },
    user_id: { type: 'string' },
    pod_id: { type: 'string' },
    coupon_code: { type: 'string' },
    subtotal: { type: 'number' },
    total: { type: 'number' },
    paid_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export interface QuoteBreakup {
  subtotal: number;
  platform_fee_pct: number;
  platform_fee_amount: number;
  gst_pct: number;
  gst_amount: number;
  total: number;
  currency_symbol: string;
  dummy_mode: boolean;
}

export async function computeQuote(amount: number, opts?: { inclusive?: boolean }): Promise<QuoteBreakup> {
  const fs = await getFinanceSettings();
  const f = fs.platform_fee_pct / 100;
  const inclusive = opts?.inclusive !== false; // default: pod_amount is the gross GST-inclusive total
  const value = Math.max(0, Number(amount) || 0);
  // Mirror the settlement engine (breakdown.math.ts): GST is extracted inclusive
  // from the total (P × g/(100+g)); the taxable value is the net-of-GST amount.
  const gst_amount = inclusive
    ? round2((value * fs.gst_pct) / (100 + fs.gst_pct))
    : round2(value * (fs.gst_pct / 100));
  const subtotal = inclusive ? round2(value - gst_amount) : round2(value);
  const total = inclusive ? round2(value) : round2(subtotal + gst_amount);
  // Platform fee is Duncit's revenue taken FROM the net (fee = net × f) — a memo
  // line that already sits inside `subtotal`, never added on top of the total.
  // Defined on the same base as the engine so invoices reconcile with settlement.
  const platform_fee_amount = round2(subtotal * f);
  return {
    subtotal,
    platform_fee_pct: fs.platform_fee_pct,
    platform_fee_amount,
    gst_pct: fs.gst_pct,
    gst_amount,
    total,
    currency_symbol: fs.currency_symbol,
    dummy_mode: fs.dummy_mode,
  };
}

const newPaymentId = () =>
  `pay_${Date.now().toString(36)}${crypto.randomBytes(4).toString('hex')}`;

/** One resolved, invoice-ready checkout line per product+variant selection. */
interface ResolvedProductLine {
  product_id: string;
  /** The pod this line was bought from — a unified cart spans pods, and the
   * per-pod stock gate + product-order split both need it. */
  pod_id: string;
  variant_id: string;
  variant_label: string;
  variant_sku: string;
  name: string;
  quantity: number;
  unit_cost: number;
  gross: number;
  fulfilment_method?: string;
}

interface ProductResolution {
  lines: ResolvedProductLine[];
  total: number;
  /** True when any selected product delivers via ShipRocket (address needed). */
  needs_shipping: boolean;
}

const EMPTY_PRODUCT_RESOLUTION: ProductResolution = { lines: [], total: 0, needs_shipping: false };

/**
 * Resolve the buyer's product selections against the pod's product_requests
 * snapshot and — when a variant was chosen — the live product's variant subdoc,
 * whose price and stock win. Gates every line: variant stock, and the pod's
 * remaining (stocked − already sold) units per product. Throws on anything not
 * buyable; returns invoice-ready lines plus the priced total.
 */
/** One merged product+variant selection line (duplicate rows summed). */
interface MergedSelection {
  product_id: string;
  variant_id: string;
  quantity: number;
  fulfilment_method?: string;
}

/** Merge duplicate selections of the same product+variant into one line. */
function mergeProductSelections(selectedProducts: any[]): Map<string, MergedSelection> {
  const merged = new Map<string, MergedSelection>();
  for (const sel of selectedProducts) {
    const productId = String(sel?.product_id || '');
    const quantity = Number(sel?.quantity) || 0;
    if (!productId || quantity <= 0) continue;
    const variantId = sel?.variant_id ? String(sel.variant_id) : '';
    const key = `${productId}|${variantId}`;
    const row = merged.get(key) ?? {
      product_id: productId,
      variant_id: variantId,
      quantity: 0,
      fulfilment_method: sel?.fulfilment_method ? String(sel.fulfilment_method) : undefined,
    };
    row.quantity += quantity;
    merged.set(key, row);
  }
  return merged;
}

/** Build one invoice-ready line for a merged selection, applying variant price +
 * stock gates. Throws when the chosen variant is gone or out of stock. */
function buildResolvedLine(row: MergedSelection, snapshot: any, product: any, podId: string): ResolvedProductLine {
  let unitCost = Number(snapshot.unit_cost || 0);
  let variant: any = null;
  if (row.variant_id) {
    variant = (product?.variants ?? []).find((v: any) => String(v._id) === row.variant_id) ?? null;
    if (!variant) {
      throw new GraphQLError('The selected product variant is no longer available', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    unitCost = Number(variant.unit_cost || 0);
    if (row.quantity > Number(variant.inventory_count || 0)) {
      throw new GraphQLError(
        `Only ${variant.inventory_count} ${snapshot.product_name} (${variant.option_label}) in stock`,
        { extensions: { code: 'BAD_USER_INPUT' } }
      );
    }
  }
  return {
    product_id: row.product_id,
    pod_id: podId,
    variant_id: row.variant_id,
    variant_label: variant?.option_label ?? '',
    variant_sku: variant?.sku ?? '',
    name: snapshot.product_name || 'Product',
    quantity: row.quantity,
    unit_cost: unitCost,
    gross: round2(unitCost * row.quantity),
    fulfilment_method: row.fulfilment_method,
  };
}

/** Pod-level gate: the pod's remaining stocked units, net of earlier sales. */
function assertPodRemainingStock(perProductQty: Map<string, number>, allowed: Map<string, any>) {
  for (const [productId, quantity] of perProductQty) {
    const snapshot = allowed.get(productId);
    const remaining = Math.max(0, Number(snapshot.quantity || 0) - Number(snapshot.sold_count || 0));
    if (quantity > remaining) {
      throw new GraphQLError(`Only ${remaining} ${snapshot.product_name} available`, { extensions: { code: 'BAD_USER_INPUT' } });
    }
  }
}

/** Pay-time gate for the temporary-deactivate flags: a paused product — or one
 * whose brand is deactivated — is hidden from the shop, so a checkout still
 * carrying it (stale cart / open pod page) must fail here instead of selling a
 * hidden product. Already-placed orders are never re-checked. */
async function assertProductsActive(products: any[]) {
  const pausedProduct = products.find((p: any) => p.is_active === false);
  if (pausedProduct) {
    throw new GraphQLError(`${pausedProduct.product_name || 'A selected product'} is currently unavailable`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const brandIds = [...new Set(products.map((p: any) => (p.brand_id ? String(p.brand_id) : '')).filter(Boolean))];
  if (brandIds.length === 0) return;
  const pausedBrands = await EcommBrandModel.find({ _id: { $in: brandIds }, is_active: false })
    .select('_id')
    .lean();
  if (pausedBrands.length === 0) return;
  const paused = new Set(pausedBrands.map((b: any) => String(b._id)));
  const hit = products.find((p: any) => p.brand_id && paused.has(String(p.brand_id)));
  throw new GraphQLError(`${hit?.product_name || 'A selected product'} is currently unavailable`, {
    extensions: { code: 'BAD_USER_INPUT' },
  });
}

async function resolveProductLines(pod: any, selectedProducts: any[] = []): Promise<ProductResolution> {
  const allowed = new Map<string, any>(
    (pod?.product_requests ?? []).map((item: any) => [String(item.product_id), item])
  );
  const merged = mergeProductSelections(selectedProducts);
  if (merged.size === 0) return EMPTY_PRODUCT_RESOLUTION;

  const productIds = Array.from(new Set(Array.from(merged.values(), (r) => r.product_id))).filter(
    (id) => Types.ObjectId.isValid(id)
  );
  const products = await InventoryProductModel.find({ _id: { $in: productIds } })
    .select('product_name variants delivery_target is_active brand_id')
    .lean();
  await assertProductsActive(products);
  const productMap = new Map<string, any>(products.map((p: any) => [String(p._id), p]));

  const lines: ResolvedProductLine[] = [];
  const perProductQty = new Map<string, number>();
  let needsShipping = false;
  for (const row of merged.values()) {
    const snapshot = allowed.get(row.product_id);
    if (!snapshot) {
      throw new GraphQLError('Selected product is not available for this pod', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const product = productMap.get(row.product_id);
    if (product?.delivery_target === 'SHIPROCKET') needsShipping = true;
    perProductQty.set(row.product_id, (perProductQty.get(row.product_id) ?? 0) + row.quantity);
    lines.push(buildResolvedLine(row, snapshot, product, String(pod?._id ?? '')));
  }
  assertPodRemainingStock(perProductQty, allowed);
  return { lines, total: round2(lines.reduce((s, l) => s + l.gross, 0)), needs_shipping: needsShipping };
}

const userDisplayName = (user: any) =>
  [user.profile?.first_name ?? user.first_name, user.profile?.last_name ?? user.last_name]
    .filter(Boolean)
    .join(' ')
    .trim() ||
  user.auth?.email ||
  user.email ||
  'Customer';

/**
 * Resolve the buyer identity + structured billing snapshot for a checkout.
 * Prefers the structured `input.billing` (address may differ from the main
 * address); falls back to the legacy free-text `billing_address` (parsed into
 * line1) so older clients keep working. Composes the flat `billing_address`
 * string from the structured parts for legacy readers + compact displays.
 */
function buildBuyerFields(input: any, user: any) {
  // The phone is optional at checkout: without a number there is no phone at
  // all, so the dialling code alone is never recorded.
  const phoneNumber = String(input.contact_phone_number ?? '').trim();
  const phoneExtension = String(input.contact_phone_extension ?? '').trim();
  const contactPhone = phoneNumber ? `${phoneExtension} ${phoneNumber}`.trim() : '';
  const name = String(input.contact_name ?? '').trim() || userDisplayName(user);
  const email = String(input.contact_email ?? '').trim().toLowerCase();
  const legacyText = String(input.billing_address ?? '').trim();
  // Structured billing is preferred; legacy free-text goes into line1 verbatim,
  // and its one-line string is kept exactly as typed (no country appended).
  const address: PostalAddress = input.billing
    ? toPostalAddress(input.billing)
    : toPostalAddress({ line1: legacyText });
  const gstin = String(input.billing?.gstin ?? '').trim().toUpperCase();
  // Billing email may be entered separately; defaults to the main contact email.
  const billingEmail = String(input.billing?.email ?? '').trim().toLowerCase() || email;
  const billing = { name, email: billingEmail, phone: contactPhone, gstin, ...address };
  const billing_address = input.billing ? composeAddressLine(address) : legacyText;
  return { user_name: name, user_email: email, user_phone: contactPhone, billing, billing_address };
}

/** The metadata blob recorded on every payment doc (source + pod breakdown).
 * `products` is the checkout's resolved product selection (variant-aware). */
const paymentMetadata = (input: any, pod: any, products: ProductResolution) => ({
  source: 'app_checkout',
  checkout_url: input.checkout_url,
  pod_id: input.pod_id || null,
  ticket_amount: pod ? Number(pod.pod_amount || 0) : null,
  // Read back at capture time — a webhook replay must book the seats that were
  // actually paid for, never the client's word at that later moment.
  seats: pod ? clampSeatsForPod(pod, input.seats) : null,
  product_cost_total: pod ? products.total : null,
  selected_products: input.selected_products ?? [],
  // Invoice-ready product lines (name/qty/unit/gross + chosen variant).
  product_lines: products.lines,
  // Fulfilment intent for the product order created on payment success.
  fulfilment_method: input.fulfilment_method ?? 'PICKUP',
  shipping_address: input.shipping_address ?? null,
});

/** Apply an optional coupon to the gross payable, returning the priced quote, the
 * undiscounted original total (for strikethrough/records) and the coupon meta.
 * Throws when a supplied coupon is invalid — never silently ignores it. */
async function applyCoupon(input: any, payableAmount: number, userId: string) {
  const originalQuote = await computeQuote(payableAmount);
  const code = (input.coupon_code || '').trim();
  if (!code) {
    return {
      quote: originalQuote,
      originalTotal: originalQuote.total,
      couponCode: null as string | null,
      couponDiscount: 0,
    };
  }
  const result = await couponService.evaluate(code, input.pod_id ?? null, payableAmount, userId);
  if (!result.ok)
    throw new GraphQLError(result.message ?? 'Invalid coupon', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  const quote = await computeQuote(result.final_total);
  return {
    quote,
    originalTotal: originalQuote.total,
    couponCode: result.coupon!.code,
    couponDiscount: round2(originalQuote.total - quote.total),
  };
}

/** Smallest amount the gateway will accept for an order (Razorpay: ₹1). */
const MIN_GATEWAY_CHARGE = 1;

/**
 * Spend the buyer's Duncit Coins against an already-couponed quote. Coins work
 * exactly like the coupon discount — they cut the gross and the quote is
 * re-priced on the reduced amount — so the invoice total always equals the
 * amount actually charged, and GST is charged on what was really paid.
 *
 * The requested count is the client's ASK, never the authority: it is clamped
 * to the live balance and to the bill, so a tampered request can neither
 * overdraw the balance nor push the total below zero. The coins are not debited
 * here — that happens on payment success, the same way a coupon's redemption is
 * only recorded once the money actually lands.
 */
async function applyCoins(requested: unknown, userId: string, quote: QuoteBreakup) {
  const wanted = Math.floor(Number(requested) || 0);
  if (wanted <= 0) return { quote, coinsRedeemed: 0 };
  const balance = await coinService.balanceOf(userId);
  let coinsRedeemed = Math.min(wanted, Math.floor(balance), Math.floor(quote.total));
  if (coinsRedeemed <= 0) return { quote, coinsRedeemed: 0 };
  // Coins are whole rupees but a bill need not be, so redeeming the floor of a
  // ₹499.50 total would leave 50 paise to charge — under Razorpay's ₹1 minimum,
  // which rejects the order outright. Hand one coin back to lift the remainder
  // clear. Redeeming the bill down to exactly zero is fine: that path skips the
  // gateway altogether.
  const remainder = round2(quote.total - coinsRedeemed);
  if (remainder > 0 && remainder < MIN_GATEWAY_CHARGE) coinsRedeemed -= 1;
  if (coinsRedeemed <= 0) return { quote, coinsRedeemed: 0 };
  return { quote: await computeQuote(round2(quote.total - coinsRedeemed)), coinsRedeemed };
}

/** How a zero-charge order was settled. It skips the gateway either way, but the
 * invoice still has to name what actually paid for it. */
const freeSettlement = (couponCode: string | null) =>
  couponCode
    ? { gateway: 'COUPON', label: 'Coupon (100% off)' }
    : { gateway: 'COINS', label: 'Duncit Coins' };

/**
 * Seats this checkout may buy. The client picks a number, but the price and the
 * capacity are the server's to decide — a client asking for 50 seats on a pod
 * with 3 left must not be quoted (or charged) for 50.
 */
function clampSeatsForPod(pod: any, requested: unknown): number {
  const seats = normalizeSeats(requested);
  const room = maxSeatsForBooking(pod);
  if (room <= 0) {
    throw new GraphQLError('Pod is full', { extensions: { code: 'POD_FULL' } });
  }
  if (seats > room) {
    throw new GraphQLError(`Only ${room} seat${room === 1 ? '' : 's'} left on this pod`, {
      extensions: { code: 'POD_FULL' },
    });
  }
  return seats;
}

/**
 * A booking is one membership. Topping up seats on an existing one is not a
 * supported flow and never was: the capture path records seats on a NEW
 * membership row, so a second purchase bumped the pod's `extra_seats` while the
 * membership kept its old count. A later backout then released only the old
 * count and orphaned the rest of the counter permanently — the pod quietly lost
 * capacity that nothing could give back. Both apps already hide the CTA for a
 * member, so this only closes the door the API left open.
 */
async function assertNotAlreadyBooked(podId: unknown, userId: string) {
  const { PodMemberModel } = await import('@modules/pods/podMember/podMember.model');
  const existing = await PodMemberModel.findOne({
    pod_id: podId,
    user_id: new Types.ObjectId(userId),
    status: { $in: ['JOINED', 'BACKOUT_IN_PROCESS'] },
  }).select('_id status');
  if (!existing) return;
  const message =
    existing.status === 'BACKOUT_IN_PROCESS'
      ? 'Your backout for this pod is still in process — use "Keep My Spot" to restore your booking.'
      : 'You have already booked this pod.';
  throw new GraphQLError(message, { extensions: { code: 'ALREADY_BOOKED' } });
}

/** Resolve what the user actually pays (pod ticket + selected products, or a raw
 * amount) plus the human description. Shared by the dummy + Razorpay flows. */
async function resolvePayable(input: any, userId?: string) {
  let pod: any = null;
  let payableAmount = Number(input.amount) || 0;
  let description = input.description || 'Booking';
  let products: ProductResolution = EMPTY_PRODUCT_RESOLUTION;
  let seats = 1;
  if (input.pod_id) {
    pod = await PodModel.findById(input.pod_id);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    if (pod.pod_date_time && new Date(pod.pod_date_time).getTime() < Date.now()) {
      throw new GraphQLError('This pod has already taken place — booking is closed.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    if (userId) await assertNotAlreadyBooked(pod._id, userId);
    seats = clampSeatsForPod(pod, input.seats);
    description =
      seats > 1
        ? `Pod booking · ${pod.pod_title} · ${seats} seats`
        : `Pod booking · ${pod.pod_title}`;
    products = await resolveProductLines(pod, input.selected_products ?? []);
    // A ShipRocket-delivered product cannot be ordered without somewhere to
    // ship it — reject up-front instead of creating a doomed SHIP order.
    if (products.needs_shipping && !input.shipping_address) {
      throw new GraphQLError('A delivery address is required for shipped products', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    // The ticket price is per seat; add-on products are charged once.
    payableAmount = round2(Number(pod.pod_amount || 0) * seats + products.total);
  }
  if (!payableAmount || payableAmount <= 0)
    throw new GraphQLError('Amount must be greater than 0', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  return { pod, payableAmount, description, products, seats };
}

/** Group cart selections by their pod so each pod's own product_requests
 * snapshot + per-pod stock gate apply (a unified cart may span pods). */
function groupItemsByPod(items: any[]): Map<string, any[]> {
  const byPod = new Map<string, any[]>();
  for (const item of items) {
    const podId = String(item?.pod_id || '');
    if (!podId) {
      throw new GraphQLError('Each cart item needs a pod', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const arr = byPod.get(podId) ?? [];
    arr.push(item);
    byPod.set(podId, arr);
  }
  return byPod;
}

interface ProductPayableResolution {
  lines: ResolvedProductLine[];
  productsTotal: number;
  needs_shipping: boolean;
  shipping: { total: number; breakup: any[]; all_quoted: boolean };
  deliveryPincode: string;
}

/**
 * Resolve a standalone product cart (possibly spanning multiple pods) into
 * priced, invoice-ready lines + the live ShipRocket delivery charge. Reuses the
 * per-pod resolver so every gate (variant/stock/sold_count) still applies, and
 * requires a delivery address whenever any line ships.
 */
async function resolveProductPayable(input: any): Promise<ProductPayableResolution> {
  const items: any[] = Array.isArray(input.items) ? input.items : [];
  if (items.length === 0) {
    throw new GraphQLError('Your cart is empty', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const byPod = groupItemsByPod(items);
  const lines: ResolvedProductLine[] = [];
  let productsTotal = 0;
  let needsShipping = false;
  for (const [podId, podItems] of byPod) {
    const pod = Types.ObjectId.isValid(podId) ? await PodModel.findById(podId) : null;
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    const resolution = await resolveProductLines(pod, podItems);
    lines.push(...resolution.lines);
    productsTotal = round2(productsTotal + resolution.total);
    if (resolution.needs_shipping) needsShipping = true;
  }
  if (needsShipping && !input.shipping_address) {
    throw new GraphQLError('A delivery address is required for shipped products', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  const deliveryPincode = String(input.delivery_pincode || input.shipping_address?.pincode || '');
  const { shiprocketService } = await import('@modules/commerce/shiprocket/shiprocket.service');
  const shipping = await shiprocketService.quoteShipping(items, deliveryPincode);
  return { lines, productsTotal, needs_shipping: needsShipping, shipping, deliveryPincode };
}

/** Coupon + GST for a product cart: the discount applies to the product subtotal
 * only; shipping is added after, and GST is extracted inclusive from the whole. */
async function applyProductCoupon(input: any, productsTotal: number, shippingCharge: number, userId: string) {
  const gross = round2(productsTotal + shippingCharge);
  const originalQuote = await computeQuote(gross);
  const code = (input.coupon_code || '').trim();
  if (!code) {
    return { quote: originalQuote, originalTotal: originalQuote.total, couponCode: null as string | null, couponDiscount: 0 };
  }
  // POD-scoped coupons correctly reject here (pod id is null for a product cart).
  const result = await couponService.evaluate(code, null, productsTotal, userId);
  if (!result.ok) {
    throw new GraphQLError(result.message ?? 'Invalid coupon', { extensions: { code: 'BAD_USER_INPUT' } });
  }
  const quote = await computeQuote(round2((Number(result.final_total) || 0) + shippingCharge));
  return {
    quote,
    originalTotal: originalQuote.total,
    couponCode: result.coupon!.code,
    couponDiscount: round2(originalQuote.total - quote.total),
  };
}

/** Metadata blob for a standalone product payment (no pod ticket). Drives the
 * per-pod/per-warehouse product-order split + the invoice's delivery line. */
const productPaymentMetadata = (input: any, resolution: ProductPayableResolution) => ({
  source: 'app_product_checkout',
  checkout_url: input.checkout_url,
  pod_id: null,
  ticket_amount: null,
  product_cost_total: resolution.productsTotal,
  selected_products: input.items ?? [],
  product_lines: resolution.lines,
  fulfilment_method: input.fulfilment_method ?? 'PICKUP',
  shipping_address: input.shipping_address ?? null,
  delivery_pincode: resolution.deliveryPincode,
  shipping: resolution.shipping,
});

interface RazorpaySheetArgs {
  paymentDocId: string;
  keyId: string;
  orderId: string;
  amountPaise: number;
  businessName: string;
  description: string;
  input: any;
  currencySymbol: string;
  total: number;
  free: boolean;
  payment: any;
}

/** Build the RazorpayOrder sheet payload the client opens (shared by the pod +
 * product live-checkout flows). */
function razorpaySheet(a: RazorpaySheetArgs) {
  return {
    payment_doc_id: a.paymentDocId,
    key_id: a.keyId,
    order_id: a.orderId,
    amount: a.amountPaise,
    currency: 'INR',
    name: a.businessName,
    description: a.description,
    prefill_email: a.input.contact_email,
    prefill_contact: a.input.contact_phone_number ?? '',
    currency_symbol: a.currencySymbol,
    total: a.total,
    free: a.free,
    payment: a.payment,
  };
}

/** Books the slot + records the PodMember row + evaluates badges for a paid pod.
 * Returns the booking (PodMember) id so the receipt email can deep-link to it. */
async function bookPodForPayment(
  pod: any,
  userId: any,
  paymentDocId: string,
  seats = 1
): Promise<string | null> {
  if (!pod) return null;
  let bookingId: string | null = null;
  // A capture can be replayed (webhook retry, a manual re-verify). The seat
  // claim below is an `$inc`, which is not idempotent, so the membership row is
  // the key: if this payment already booked, there is nothing left to do.
  const { PodMemberModel } = await import('@modules/pods/podMember/podMember.model');
  const already = await PodMemberModel.findOne({
    payment_id: new Types.ObjectId(paymentDocId),
  }).select('_id');
  if (already) return String(already._id);
  // The buyer appears once (identity); the seats beyond their own are the
  // pod-level counter, so occupancy stays right without duplicating an id.
  //
  // A failed claim used to be logged and stepped over, which then issued a
  // membership and a ticket for seats nobody held. The money is already taken at
  // this point, so the honest outcome is to book nothing and mark the payment for
  // refund — Finance can see it, and the pod is not oversold.
  try {
    await claimSeats(pod._id, userId, seats);
  } catch (e) {
    logs.server.error('payment', 'bookPodForPayment', {
      error: e,
      msg: 'Seat claim failed after payment — booking skipped, refund required',
      podId: String(pod._id),
      paymentDocId,
      seats,
    });
    await PaymentModel.updateOne(
      { _id: paymentDocId },
      { $set: { 'metadata.seat_claim_failed': true } },
    );
    return null;
  }
  try {
    const { podMemberService } = await import('@modules/pods/podMember/podMember.service');
    const member = await podMemberService.recordPaidJoin(
      String(pod._id),
      String(userId),
      paymentDocId,
      seats
    );
    bookingId = member?._id ? String(member._id) : null;
  } catch (e) {
    logs.server.warn('payment', 'bookPodForPayment', { error: e, msg: 'PodMember record failed' });
  }
  try {
    const { evaluateBadgesForUser } = await import('@modules/engagement/badge/badge.service');
    evaluateBadgesForUser(String(userId), 'POD_JOIN').catch(() => {});
  } catch {
    /* noop */
  }
  return bookingId;
}

/** Multi-line bill-to address for the invoice, composed from the frozen billing
 * snapshot. Empty parts drop out; returns [] when no address was captured. */
/** Post-success side effects shared by every gateway: book the pod, generate the
 * invoice PDF and email the receipt. The payment doc must already be SUCCESS with
 * an invoice number + paid_at set. Best-effort — failures here never fail payment. */
async function finalizePaidPayment(doc: IPayment, fs: any, methodLabel: string) {
  const pod = doc.pod_id ? await PodModel.findById(doc.pod_id) : null;
  // Seats come off the payment's own metadata, frozen when the order was priced.
  const paidSeats = normalizeSeats((doc.metadata as any)?.seats ?? 1);
  const bookingId = await bookPodForPayment(pod, doc.user_id, String(doc._id), paidSeats);
  // Fulfilment: create the product order(s) for any add-on products bought.
  // Best-effort + idempotent — never fail a paid checkout on a fulfilment hiccup.
  try {
    const { productOrderService } = await import('@modules/commerce/productOrder/productOrder.service');
    await productOrderService.createFromPayment(doc);
  } catch (e) {
    logs.server.warn('payment', 'finalizePaidPayment', { error: e, msg: 'ProductOrder creation failed' });
  }
  // Marketing attribution: credit this sale to the short link the buyer came
  // through, if any. Every paid path funnels through here — dummy, 100%-off
  // coupon and Razorpay alike — so this is the one place it belongs. Silent
  // for the majority who never followed a link, and best-effort: attribution
  // must never fail a payment that already succeeded.
  try {
    const { shortLinkJourneyService } = await import('@modules/crm/marketing/shortLinkJourney.service');
    await shortLinkJourneyService.attributePayment({
      userId: String(doc.user_id),
      paymentId: String(doc._id),
      amount: doc.total,
      at: doc.paid_at ?? undefined,
    });
  } catch (e) {
    logs.server.warn('payment', 'finalizePaidPayment', { error: e, msg: 'Short-link attribution failed' });
  }
  // Duncit Coins: the buyer earns a share of what they just spent back as
  // coins. Every paid path funnels through here — dummy, 100%-off coupon,
  // Razorpay, pod and product alike — so this is the one place it belongs.
  // Idempotent per payment_id inside the service, and best-effort: a reward
  // must never fail a payment that already succeeded.
  // The redemption is settled first, then the reward is earned on `doc.total` —
  // which is already net of the coins spent, so coins can never earn more coins.
  try {
    await coinService.redeemForPayment({
      userId: String(doc.user_id),
      paymentId: doc.payment_id,
      coins: doc.coins_redeemed,
      reason: doc.description || 'Purchase',
    });
    await coinService.creditForPayment({
      userId: String(doc.user_id),
      paymentId: doc.payment_id,
      spendAmount: doc.total,
      reason: doc.description || 'Purchase',
      // Pod tickets and shop orders earn at separately configured rates.
      targetType: doc.target_type,
    });
  } catch (e) {
    logs.server.warn('payment', 'finalizePaidPayment', { error: e, msg: 'Coin settlement failed' });
  }
  try {
    const pdf = await generateInvoicePdf(
      await invoiceDataForPayment(doc, { paymentMethod: methodLabel })
    );
    const urlConfigs = await getUrlConfigs();
    const bookingUrl = bookingId ? bookingLinkUrl(urlConfigs.appUrl, bookingId) : urlConfigs.appUrl;
    await sendEmail({
      to: doc.user_email,
      subject: `Payment Receipt — ${doc.invoice_no}`,
      template: 'payment-receipt',
      category: 'billing',
      vars: {
        name: doc.user_name,
        summary:
          pod && (pod as any).pod_date_time
            ? `${(pod as any).pod_title} — ${new Date((pod as any).pod_date_time).toLocaleString('en-IN')}`
            : doc.description,
        invoice_no: doc.invoice_no || '',
        payment_id: doc.payment_id,
        amount: `${fs.currency_symbol}${doc.total.toFixed(2)}`,
        booking_url: bookingUrl,
        // Templates already cached in the DB still carry the old `{{app_url}}`
        // CTA, so it has to resolve to the same deep link (the disk template is
        // only imported once, never re-synced).
        app_url: bookingUrl,
      },
      attachments: [
        {
          filename: `invoice-${doc.invoice_no!.replace(/[^A-Za-z0-9_-]+/g, '-')}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ],
    });
  } catch (e) {
    logs.server.warn('payment', 'finalizePaidPayment', { error: e, msg: 'Receipt/invoice email failed' });
  }
}

type PaymentListFilter = { status?: string; user_id?: string; pod_id?: string; search?: string };

/** Mongo match for a PaymentFilterInput — shared by the list query and the KPI totals. */
const buildListFilter = (filter?: PaymentListFilter) => {
  const q: any = {};
  if (filter?.status) q.status = filter.status;
  if (filter?.user_id) q.user_id = new Types.ObjectId(filter.user_id);
  if (filter?.pod_id) q.pod_id = new Types.ObjectId(filter.pod_id);
  if (filter?.search) {
    const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
    q.$or = [{ payment_id: r }, { invoice_no: r }, { user_name: r }, { user_email: r }];
  }
  return q;
};

export const paymentService = {
  /**
   * The checkout preview. For a pod it prices the ticket × seats server-side
   * rather than trusting the amount the client typed — the preview and the
   * charge must never be able to disagree about what a seat costs.
   */
  async quoteCheckout(input: { amount: number; pod_id?: string | null; seats?: number | null }) {
    const seats = normalizeSeats(input.seats);
    // Single-seat quotes keep their exact previous behaviour (the caller's
    // amount already carries any add-on products); only the multi-seat case
    // needs the server to re-price, and only the ticket multiplies.
    if (!input.pod_id || seats <= 1) return computeQuote(input.amount);
    const pod = await PodModel.findById(input.pod_id).select(
      'pod_amount no_of_spots pod_attendees extra_seats'
    );
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    clampSeatsForPod(pod, seats);
    const ticket = Number(pod.pod_amount || 0);
    const extras = Math.max(round2(Number(input.amount) || 0) - ticket, 0);
    return computeQuote(round2(ticket * seats + extras));
  },

  async list(filter?: PaymentListFilter, limit = 200) {
    const docs = await PaymentModel.find(buildListFilter(filter)).sort({ created_at: -1 }).limit(limit);
    return docs.map(toPub);
  },

  /**
   * Filter-wide KPI totals for the finance Payment Logs cards. Applies the same
   * PaymentFilterInput as `list` but aggregates over EVERY matching document
   * (no row cap), counting SUCCESS money only — so a filter narrowed to another
   * status matches nothing, exactly like SUCCESS-only cards over that list.
   */
  async totals(filter?: PaymentListFilter) {
    const empty = { count: 0, gross: 0, fee: 0, gst: 0 };
    const q = buildListFilter(filter);
    if (q.status && q.status !== 'SUCCESS') return empty;
    q.status = 'SUCCESS';
    const [row] = await PaymentModel.aggregate([
      { $match: q },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          gross: { $sum: '$total' },
          fee: { $sum: '$platform_fee_amount' },
          gst: { $sum: '$gst_amount' },
        },
      },
    ]);
    if (!row) return empty;
    return { count: row.count, gross: round2(row.gross), fee: round2(row.fee), gst: round2(row.gst) };
  },

  /** Server-side table page (search/filter/sort/paginate) for the paymentsTable query. */
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<IPayment>(
      PaymentModel,
      {},
      input,
      PAYMENT_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  /**
   * The same table page as `table`, permanently narrowed to ONE pod.
   *
   * The pod filter is the BASE filter, not something the caller supplies, so a
   * caller who may only see one pod's money cannot widen it through the query
   * input the way `table` allows. Used by the club-admin pod detail, whose
   * reader is trusted with their own club and nothing else.
   */
  async tableForPod(podDocId: string, input?: TableQueryInput | null) {
    if (!Types.ObjectId.isValid(podDocId)) {
      return { rows: [], total: 0, page: 1, page_size: 0 };
    }
    const { docs, total, page, page_size } = await runTableQuery<IPayment>(
      PaymentModel,
      { pod_id: new Types.ObjectId(podDocId) },
      input,
      PAYMENT_TABLE_CONFIG
    );
    return { rows: docs.map(toPub), total, page, page_size };
  },

  async getById(id: string) {
    const d = await PaymentModel.findById(id);
    return d ? toPub(d) : null;
  },

  async listForUser(userId: string) {
    const docs = await PaymentModel.find({ user_id: new Types.ObjectId(userId) }).sort({
      created_at: -1,
    });
    return docs.map(toPub);
  },

  async dummyCheckout(input: any, userId: string) {
    const fs = await getFinanceSettings();
    if (!fs.dummy_mode) {
      throw new GraphQLError('Live payment gateway is not configured. Enable dummy mode to test.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    const user = await UserModel.findById(userId);
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });

    const { pod, payableAmount, description, products } = await resolvePayable(input, userId);
    const {
      quote: couponedQuote,
      originalTotal,
      couponCode,
      couponDiscount,
    } = await applyCoupon(input, payableAmount, userId);
    const { quote, coinsRedeemed } = await applyCoins(input.redeem_coins, userId, couponedQuote);

    const status = input.simulate_failure ? 'FAILED' : 'SUCCESS';
    const paidAt = status === 'SUCCESS' ? new Date() : null;
    const invoice_no = status === 'SUCCESS' ? await nextInvoiceNumber() : null;

    const doc = await PaymentModel.create({
      payment_id: newPaymentId(),
      invoice_no,
      user_id: user._id,
      ...buildBuyerFields(input, user),
      checkout_url: input.checkout_url,
      target_type: input.pod_id ? 'POD' : 'OTHER',
      pod_id: input.pod_id ? new Types.ObjectId(input.pod_id) : null,
      description,
      subtotal: quote.subtotal,
      platform_fee_pct: quote.platform_fee_pct,
      platform_fee_amount: quote.platform_fee_amount,
      gst_pct: quote.gst_pct,
      gst_amount: quote.gst_amount,
      total: quote.total,
      currency_symbol: quote.currency_symbol,
      coupon_code: couponCode,
      coupon_discount: couponDiscount,
      coins_redeemed: coinsRedeemed,
      status,
      gateway: 'DUMMY',
      gateway_ref: status === 'SUCCESS' ? `dummy_${Date.now()}` : null,
      paid_at: paidAt,
      metadata: { ...paymentMetadata(input, pod, products), original_total: originalTotal },
    });

    if (status === 'SUCCESS') {
      await finalizePaidPayment(doc, fs, 'Dummy Gateway');
      if (couponCode) await couponService.recordRedemption(couponCode);
    }
    return toPub(doc);
  },

  /** Step 1 of live checkout: create a Razorpay order + a PENDING payment row,
   * and return everything the client needs to open the Razorpay sheet. */
  async createRazorpayCheckout(input: any, userId: string) {
    const fs = await getFinanceSettings();
    const { keyId } = await getRazorpayKeys();
    const user = await UserModel.findById(userId);
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });

    const { pod, payableAmount, description, products } = await resolvePayable(input, userId);
    const {
      quote: couponedQuote,
      originalTotal,
      couponCode,
      couponDiscount,
    } = await applyCoupon(input, payableAmount, userId);
    const { quote, coinsRedeemed } = await applyCoins(input.redeem_coins, userId, couponedQuote);
    const payment_id = newPaymentId();
    const base = {
      payment_id,
      user_id: user._id,
      ...buildBuyerFields(input, user),
      checkout_url: input.checkout_url,
      target_type: input.pod_id ? 'POD' : 'OTHER',
      pod_id: input.pod_id ? new Types.ObjectId(input.pod_id) : null,
      description,
      subtotal: quote.subtotal,
      platform_fee_pct: quote.platform_fee_pct,
      platform_fee_amount: quote.platform_fee_amount,
      gst_pct: quote.gst_pct,
      gst_amount: quote.gst_amount,
      total: quote.total,
      currency_symbol: quote.currency_symbol,
      coupon_code: couponCode,
      coupon_discount: couponDiscount,
      coins_redeemed: coinsRedeemed,
    };

    // Nothing left to charge (100%-off coupon, or coins covering the whole
    // bill) → finalize immediately and skip the gateway.
    if (quote.total <= 0) {
      const settlement = freeSettlement(couponCode);
      const freeDoc = await PaymentModel.create({
        ...base,
        invoice_no: await nextInvoiceNumber(),
        status: 'SUCCESS',
        gateway: settlement.gateway,
        gateway_ref: `free_${Date.now()}`,
        paid_at: new Date(),
        metadata: { ...paymentMetadata(input, pod, products), original_total: originalTotal },
      });
      await finalizePaidPayment(freeDoc, fs, settlement.label);
      if (couponCode) await couponService.recordRedemption(couponCode);
      return razorpaySheet({
        paymentDocId: String(freeDoc._id),
        keyId,
        orderId: '',
        amountPaise: 0,
        businessName: fs.business_name,
        description,
        input,
        currencySymbol: quote.currency_symbol,
        total: 0,
        free: true,
        payment: toPub(freeDoc),
      });
    }

    const amountPaise = Math.round(quote.total * 100);
    const order = await createRazorpayOrder({
      amountPaise,
      currency: 'INR',
      receipt: payment_id,
      notes: { pod_id: input.pod_id || '', user_id: String(user._id) },
    });

    const doc = await PaymentModel.create({
      ...base,
      invoice_no: null,
      status: 'PENDING',
      gateway: 'RAZORPAY',
      gateway_ref: order.id,
      paid_at: null,
      metadata: { ...paymentMetadata(input, pod, products), original_total: originalTotal, razorpay_order_id: order.id },
    });

    return razorpaySheet({
      paymentDocId: String(doc._id),
      keyId,
      orderId: order.id,
      amountPaise,
      businessName: fs.business_name,
      description,
      input,
      currencySymbol: quote.currency_symbol,
      total: quote.total,
      free: false,
      payment: null,
    });
  },

  /** Step 2 of live checkout: verify the signature, then finalize the payment. */
  async verifyRazorpayCheckout(input: any, userId: string) {
    const doc = await PaymentModel.findById(input.payment_doc_id);
    if (!doc) throw new GraphQLError('Payment not found', { extensions: { code: 'NOT_FOUND' } });
    if (String(doc.user_id) !== String(userId))
      throw new GraphQLError('Not your payment', { extensions: { code: 'FORBIDDEN' } });
    if (doc.gateway !== 'RAZORPAY' || doc.gateway_ref !== input.razorpay_order_id)
      throw new GraphQLError('Payment/order mismatch', { extensions: { code: 'BAD_USER_INPUT' } });
    if (doc.status === 'SUCCESS') return toPub(doc);

    const ok = await verifyRazorpaySignature({
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
    });
    if (!ok) {
      doc.status = 'FAILED';
      await doc.save();
      throw new GraphQLError('Payment signature verification failed', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }

    const fs = await getFinanceSettings();
    doc.status = 'SUCCESS';
    doc.paid_at = new Date();
    doc.invoice_no = await nextInvoiceNumber();
    doc.gateway_ref = input.razorpay_payment_id;
    (doc as any).metadata = {
      ...(doc as any).metadata,
      razorpay_order_id: input.razorpay_order_id,
      razorpay_payment_id: input.razorpay_payment_id,
    };
    await doc.save();
    await finalizePaidPayment(doc, fs, 'Razorpay');
    if (doc.coupon_code) await couponService.recordRedemption(doc.coupon_code);
    return toPub(doc);
  },

  /** Live ShipRocket delivery estimate for a product cart (preview only). The
   * charged amount is recomputed server-side at checkout, never trusted from here. */
  async productShippingQuote(input: any) {
    const items = Array.isArray(input.items) ? input.items : [];
    const deliveryPincode = String(input.delivery_pincode || '');
    const fs = await getFinanceSettings();
    const { shiprocketService } = await import('@modules/commerce/shiprocket/shiprocket.service');
    const quote = await shiprocketService.quoteShipping(items, deliveryPincode);
    return {
      total: quote.total,
      currency_symbol: fs.currency_symbol,
      all_quoted: quote.all_quoted,
      lines: quote.breakup,
    };
  },

  /** Standalone product-cart checkout via the dummy gateway (no pod ticket). */
  async dummyProductCheckout(input: any, userId: string) {
    const fs = await getFinanceSettings();
    if (!fs.dummy_mode) {
      throw new GraphQLError('Live payment gateway is not configured. Enable dummy mode to test.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    const user = await UserModel.findById(userId);
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });

    const resolution = await resolveProductPayable(input);
    const {
      quote: couponedQuote,
      originalTotal,
      couponCode,
      couponDiscount,
    } = await applyProductCoupon(
      input,
      resolution.productsTotal,
      resolution.shipping.total,
      userId
    );
    const { quote, coinsRedeemed } = await applyCoins(input.redeem_coins, userId, couponedQuote);

    const status = input.simulate_failure ? 'FAILED' : 'SUCCESS';
    const paidAt = status === 'SUCCESS' ? new Date() : null;
    const invoice_no = status === 'SUCCESS' ? await nextInvoiceNumber() : null;

    const doc = await PaymentModel.create({
      payment_id: newPaymentId(),
      invoice_no,
      user_id: user._id,
      ...buildBuyerFields(input, user),
      checkout_url: input.checkout_url,
      target_type: 'PRODUCT',
      pod_id: null,
      description: input.description || 'Product order',
      subtotal: quote.subtotal,
      platform_fee_pct: quote.platform_fee_pct,
      platform_fee_amount: quote.platform_fee_amount,
      gst_pct: quote.gst_pct,
      gst_amount: quote.gst_amount,
      total: quote.total,
      currency_symbol: quote.currency_symbol,
      coupon_code: couponCode,
      coupon_discount: couponDiscount,
      coins_redeemed: coinsRedeemed,
      status,
      gateway: 'DUMMY',
      gateway_ref: status === 'SUCCESS' ? `dummy_${Date.now()}` : null,
      paid_at: paidAt,
      metadata: { ...productPaymentMetadata(input, resolution), original_total: originalTotal },
    });

    if (status === 'SUCCESS') {
      await finalizePaidPayment(doc, fs, 'Dummy Gateway');
      if (couponCode) await couponService.recordRedemption(couponCode);
    }
    return toPub(doc);
  },

  /** Step 1 of live product-cart checkout: create a Razorpay order + a PENDING
   * PRODUCT payment. Verified via the shared verifyRazorpayPayment. */
  async createRazorpayProductCheckout(input: any, userId: string) {
    const fs = await getFinanceSettings();
    const { keyId } = await getRazorpayKeys();
    const user = await UserModel.findById(userId);
    if (!user) throw new GraphQLError('User not found', { extensions: { code: 'NOT_FOUND' } });

    const resolution = await resolveProductPayable(input);
    const {
      quote: couponedQuote,
      originalTotal,
      couponCode,
      couponDiscount,
    } = await applyProductCoupon(
      input,
      resolution.productsTotal,
      resolution.shipping.total,
      userId
    );
    const { quote, coinsRedeemed } = await applyCoins(input.redeem_coins, userId, couponedQuote);
    const payment_id = newPaymentId();
    const description = input.description || 'Product order';
    const base = {
      payment_id,
      user_id: user._id,
      ...buildBuyerFields(input, user),
      checkout_url: input.checkout_url,
      target_type: 'PRODUCT',
      pod_id: null,
      description,
      subtotal: quote.subtotal,
      platform_fee_pct: quote.platform_fee_pct,
      platform_fee_amount: quote.platform_fee_amount,
      gst_pct: quote.gst_pct,
      gst_amount: quote.gst_amount,
      total: quote.total,
      currency_symbol: quote.currency_symbol,
      coupon_code: couponCode,
      coupon_discount: couponDiscount,
      coins_redeemed: coinsRedeemed,
    };

    // Nothing left to charge (100%-off coupon, or coins covering the whole
    // bill) → finalize immediately and skip the gateway.
    if (quote.total <= 0) {
      const settlement = freeSettlement(couponCode);
      const freeDoc = await PaymentModel.create({
        ...base,
        invoice_no: await nextInvoiceNumber(),
        status: 'SUCCESS',
        gateway: settlement.gateway,
        gateway_ref: `free_${Date.now()}`,
        paid_at: new Date(),
        metadata: { ...productPaymentMetadata(input, resolution), original_total: originalTotal },
      });
      await finalizePaidPayment(freeDoc, fs, settlement.label);
      if (couponCode) await couponService.recordRedemption(couponCode);
      return razorpaySheet({
        paymentDocId: String(freeDoc._id),
        keyId,
        orderId: '',
        amountPaise: 0,
        businessName: fs.business_name,
        description,
        input,
        currencySymbol: quote.currency_symbol,
        total: 0,
        free: true,
        payment: toPub(freeDoc),
      });
    }

    const amountPaise = Math.round(quote.total * 100);
    const order = await createRazorpayOrder({
      amountPaise,
      currency: 'INR',
      receipt: payment_id,
      notes: { kind: 'product', user_id: String(user._id) },
    });

    const doc = await PaymentModel.create({
      ...base,
      invoice_no: null,
      status: 'PENDING',
      gateway: 'RAZORPAY',
      gateway_ref: order.id,
      paid_at: null,
      metadata: { ...productPaymentMetadata(input, resolution), original_total: originalTotal, razorpay_order_id: order.id },
    });

    return razorpaySheet({
      paymentDocId: String(doc._id),
      keyId,
      orderId: order.id,
      amountPaise,
      businessName: fs.business_name,
      description,
      input,
      currencySymbol: quote.currency_symbol,
      total: quote.total,
      free: false,
      payment: null,
    });
  },

  async refund(paymentDocId: string, reason?: string) {
    const doc = await PaymentModel.findById(paymentDocId);
    if (!doc) throw new GraphQLError('Payment not found', { extensions: { code: 'NOT_FOUND' } });
    if (doc.status !== 'SUCCESS') {
      throw new GraphQLError('Only SUCCESS payments can be refunded', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    doc.status = 'REFUNDED';
    (doc as any).metadata = {
      ...(doc as any).metadata,
      refund_reason: reason || null,
      refunded_at: new Date().toISOString(),
    };
    await doc.save();
    return toPub(doc);
  },

  async invoicePdfBase64(paymentDocId: string, requesterId: string, isAdmin: boolean) {
    const doc = await PaymentModel.findById(paymentDocId);
    if (!doc) throw new GraphQLError('Payment not found', { extensions: { code: 'NOT_FOUND' } });
    if (!isAdmin && String(doc.user_id) !== String(requesterId))
      throw new GraphQLError('Not your invoice', { extensions: { code: 'FORBIDDEN' } });
    if (!doc.invoice_no) {
      throw new GraphQLError('No invoice generated for this payment', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    const fs = await getFinanceSettings();
    const pdf = await generateInvoicePdf(
      await invoiceDataForPayment(doc, {
        paymentMethod: doc.gateway || 'Gateway',
        currencySymbol: doc.currency_symbol,
      })
    );
    return pdf.toString('base64');
  },
};
