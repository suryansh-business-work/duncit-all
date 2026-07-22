import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import crypto from 'node:crypto';
import { PaymentModel, type IPayment } from './payment.model';
import { PodModel } from '@modules/pods/pod/pod.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { UserModel } from '@modules/access/user/user.model';
import { getFinanceSettings, nextInvoiceNumber } from '@modules/finance/finance/finance.model';
import { sendEmail } from '@services/email/email.service';
import { generateInvoicePdf } from '@services/invoice/invoice.pdf';
import { getUrlConfigs } from '@config/url-configs';
import {
  createRazorpayOrder,
  getRazorpayKeys,
  verifyRazorpaySignature,
} from './razorpay.gateway';
import { couponService } from '@modules/finance/coupon/coupon.service';
import { toPostalAddress, composeAddressLine, type PostalAddress } from '@utils/address';
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
function buildResolvedLine(row: MergedSelection, snapshot: any, product: any): ResolvedProductLine {
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
    .select('product_name variants delivery_target')
    .lean();
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
    lines.push(buildResolvedLine(row, snapshot, product));
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
  const contactPhone = `${input.contact_phone_extension} ${input.contact_phone_number}`.trim();
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

/** Resolve what the user actually pays (pod ticket + selected products, or a raw
 * amount) plus the human description. Shared by the dummy + Razorpay flows. */
async function resolvePayable(input: any) {
  let pod: any = null;
  let payableAmount = Number(input.amount) || 0;
  let description = input.description || 'Booking';
  let products: ProductResolution = EMPTY_PRODUCT_RESOLUTION;
  if (input.pod_id) {
    pod = await PodModel.findById(input.pod_id);
    if (!pod) throw new GraphQLError('Pod not found', { extensions: { code: 'NOT_FOUND' } });
    if (pod.pod_date_time && new Date(pod.pod_date_time).getTime() < Date.now()) {
      throw new GraphQLError('This pod has already taken place — booking is closed.', {
        extensions: { code: 'BAD_REQUEST' },
      });
    }
    description = `Pod booking · ${pod.pod_title}`;
    products = await resolveProductLines(pod, input.selected_products ?? []);
    // A ShipRocket-delivered product cannot be ordered without somewhere to
    // ship it — reject up-front instead of creating a doomed SHIP order.
    if (products.needs_shipping && !input.shipping_address) {
      throw new GraphQLError('A delivery address is required for shipped products', {
        extensions: { code: 'BAD_USER_INPUT' },
      });
    }
    payableAmount = round2(Number(pod.pod_amount || 0) + products.total);
  }
  if (!payableAmount || payableAmount <= 0)
    throw new GraphQLError('Amount must be greater than 0', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  return { pod, payableAmount, description, products };
}

/** Books the slot + records the PodMember row + evaluates badges for a paid pod. */
async function bookPodForPayment(pod: any, userId: any, paymentDocId: string) {
  if (!pod) return;
  try {
    if (!pod.pod_attendees.some((u: any) => String(u) === String(userId))) {
      pod.pod_attendees.push(userId);
      await pod.save();
    }
  } catch (e) {
    logs.server.warn('payment', 'bookPodForPayment', { error: e, msg: 'Pod attendee update failed' });
  }
  try {
    const { podMemberService } = await import('@modules/pods/podMember/podMember.service');
    await podMemberService.recordPaidJoin(String(pod._id), String(userId), paymentDocId);
  } catch (e) {
    logs.server.warn('payment', 'bookPodForPayment', { error: e, msg: 'PodMember record failed' });
  }
  try {
    const { evaluateBadgesForUser } = await import('@modules/engagement/badge/badge.service');
    evaluateBadgesForUser(String(userId), 'POD_JOIN').catch(() => {});
  } catch {
    /* noop */
  }
}

/** Multi-line bill-to address for the invoice, composed from the frozen billing
 * snapshot. Empty parts drop out; returns [] when no address was captured. */
function billingAddressLines(b?: IPayment['billing']): string[] {
  if (!b) return [];
  const cityState = [b.city, b.state].filter(Boolean).join(', ');
  return [
    b.line1,
    [b.line2, b.landmark].filter(Boolean).join(', '),
    [cityState, b.pincode].filter(Boolean).join(' - '),
    b.country,
  ]
    .map((s) => (s || '').trim())
    .filter(Boolean);
}

/**
 * Invoice line items for a payment. When products were bought alongside the pod
 * ticket, split the (net) subtotal into an "Event ticket" line + one line per
 * product, in proportion to each part's gross price — so the lines still sum to
 * the subtotal while itemizing what the buyer paid for. Falls back to a single
 * line (= subtotal) when there are no products.
 */
function buildInvoiceItems(doc: IPayment): Array<{ description: string; qty: number; unit_price: number; amount: number }> {
  const meta: Record<string, any> = doc.metadata ?? {};
  const productLines: any[] = Array.isArray(meta.product_lines) ? meta.product_lines : [];
  const ticketGross = round2(Number(meta.ticket_amount ?? 0));
  const productGross = round2(productLines.reduce((sum, l) => sum + Number(l.gross || 0), 0));
  const totalGross = round2(ticketGross + productGross);

  if (productLines.length === 0 || totalGross <= 0) {
    return [{ description: doc.description, qty: 1, unit_price: doc.subtotal, amount: doc.subtotal }];
  }

  // Proportional share of the net subtotal, largest-remainder-safe: the ticket
  // line absorbs the rounding residue so the items sum to the subtotal exactly.
  const shareOf = (gross: number) => round2((doc.subtotal * gross) / totalGross);
  const items = productLines.map((l) => {
    const amount = shareOf(Number(l.gross || 0));
    const qty = Number(l.quantity) || 1;
    return { description: l.name || 'Product', qty, unit_price: round2(amount / qty), amount };
  });
  const productsNet = round2(items.reduce((sum, it) => sum + it.amount, 0));
  const ticketNet = round2(doc.subtotal - productsNet);
  return [{ description: 'Event ticket', qty: 1, unit_price: ticketNet, amount: ticketNet }, ...items];
}

/** Invoice bill-to fields from a payment — prefers the billing snapshot, falls
 * back to the flat buyer identity for older payments without a billing block.
 * Both the main contact email and a differing billing email print on the invoice. */
function invoiceBillTo(doc: IPayment) {
  const b = doc.billing;
  const billingEmail = b?.email && b.email !== doc.user_email ? b.email : undefined;
  return {
    customer_name: b?.name || doc.user_name,
    customer_email: doc.user_email,
    customer_billing_email: billingEmail,
    customer_phone: b?.phone || doc.user_phone || undefined,
    customer_gstin: b?.gstin || undefined,
    customer_address_lines: billingAddressLines(b),
  };
}

/** Post-success side effects shared by every gateway: book the pod, generate the
 * invoice PDF and email the receipt. The payment doc must already be SUCCESS with
 * an invoice number + paid_at set. Best-effort — failures here never fail payment. */
async function finalizePaidPayment(doc: IPayment, fs: any, methodLabel: string) {
  const pod = doc.pod_id ? await PodModel.findById(doc.pod_id) : null;
  await bookPodForPayment(pod, doc.user_id, String(doc._id));
  // Fulfilment: create the product order(s) for any add-on products bought.
  // Best-effort + idempotent — never fail a paid checkout on a fulfilment hiccup.
  try {
    const { productOrderService } = await import('@modules/commerce/productOrder/productOrder.service');
    await productOrderService.createFromPayment(doc);
  } catch (e) {
    logs.server.warn('payment', 'finalizePaidPayment', { error: e, msg: 'ProductOrder creation failed' });
  }
  try {
    const pdf = await generateInvoicePdf({
      invoice_no: doc.invoice_no!,
      invoice_date: doc.paid_at!,
      ...invoiceBillTo(doc),
      business_name: fs.business_name,
      business_address: fs.business_address,
      business_gstin: fs.business_gstin,
      currency_symbol: fs.currency_symbol,
      items: buildInvoiceItems(doc),
      subtotal: doc.subtotal,
      gst_amount: doc.gst_amount,
      gst_pct: doc.gst_pct,
      total: doc.total,
      payment_id: doc.payment_id,
      payment_method: methodLabel,
      invoice_label: fs.invoice_label,
      invoice_support_email: fs.invoice_support_email,
      invoice_support_phone: fs.invoice_support_phone,
      invoice_footer_note: fs.invoice_footer_note,
      invoice_terms: fs.invoice_terms,
      invoice_logo_url: fs.invoice_logo_url,
    });
    const urlConfigs = await getUrlConfigs();
    await sendEmail({
      to: doc.user_email,
      subject: `Payment Receipt — ${doc.invoice_no}`,
      template: 'payment-receipt',
      vars: {
        name: doc.user_name,
        summary:
          pod && (pod as any).pod_date_time
            ? `${(pod as any).pod_title} — ${new Date((pod as any).pod_date_time).toLocaleString('en-IN')}`
            : doc.description,
        invoice_no: doc.invoice_no || '',
        payment_id: doc.payment_id,
        amount: `${fs.currency_symbol}${doc.total.toFixed(2)}`,
        app_url: urlConfigs.appUrl,
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

export const paymentService = {
  async list(filter?: { status?: string; user_id?: string; pod_id?: string; search?: string }, limit = 200) {
    const q: any = {};
    if (filter?.status) q.status = filter.status;
    if (filter?.user_id) q.user_id = new Types.ObjectId(filter.user_id);
    if (filter?.pod_id) q.pod_id = new Types.ObjectId(filter.pod_id);
    if (filter?.search) {
      const r = new RegExp(filter.search.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
      q.$or = [{ payment_id: r }, { invoice_no: r }, { user_name: r }, { user_email: r }];
    }
    const docs = await PaymentModel.find(q).sort({ created_at: -1 }).limit(limit);
    return docs.map(toPub);
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

    const { pod, payableAmount, description, products } = await resolvePayable(input);
    const { quote, originalTotal, couponCode, couponDiscount } = await applyCoupon(
      input,
      payableAmount,
      userId
    );

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

    const { pod, payableAmount, description, products } = await resolvePayable(input);
    const { quote, originalTotal, couponCode, couponDiscount } = await applyCoupon(
      input,
      payableAmount,
      userId
    );
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
    };

    // 100%-off coupon → nothing to charge: finalize immediately, skip the gateway.
    if (quote.total <= 0) {
      const freeDoc = await PaymentModel.create({
        ...base,
        invoice_no: await nextInvoiceNumber(),
        status: 'SUCCESS',
        gateway: 'COUPON',
        gateway_ref: `coupon_${Date.now()}`,
        paid_at: new Date(),
        metadata: { ...paymentMetadata(input, pod, products), original_total: originalTotal },
      });
      await finalizePaidPayment(freeDoc, fs, 'Coupon (100% off)');
      if (couponCode) await couponService.recordRedemption(couponCode);
      return {
        payment_doc_id: String(freeDoc._id),
        key_id: keyId,
        order_id: '',
        amount: 0,
        currency: 'INR',
        name: fs.business_name,
        description,
        prefill_email: input.contact_email,
        prefill_contact: input.contact_phone_number,
        currency_symbol: quote.currency_symbol,
        total: 0,
        free: true,
        payment: toPub(freeDoc),
      };
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

    return {
      payment_doc_id: String(doc._id),
      key_id: keyId,
      order_id: order.id,
      amount: amountPaise,
      currency: 'INR',
      name: fs.business_name,
      description,
      prefill_email: input.contact_email,
      prefill_contact: input.contact_phone_number,
      currency_symbol: quote.currency_symbol,
      total: quote.total,
      free: false,
      payment: null,
    };
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
    const pdf = await generateInvoicePdf({
      invoice_no: doc.invoice_no,
      invoice_date: doc.paid_at || doc.created_at,
      ...invoiceBillTo(doc),
      business_name: fs.business_name,
      business_address: fs.business_address,
      business_gstin: fs.business_gstin,
      currency_symbol: doc.currency_symbol,
      items: buildInvoiceItems(doc),
      subtotal: doc.subtotal,
      gst_amount: doc.gst_amount,
      gst_pct: doc.gst_pct,
      total: doc.total,
      payment_id: doc.payment_id,
      payment_method: doc.gateway || 'Gateway',
      invoice_label: fs.invoice_label,
      invoice_support_email: fs.invoice_support_email,
      invoice_support_phone: fs.invoice_support_phone,
      invoice_footer_note: fs.invoice_footer_note,
      invoice_terms: fs.invoice_terms,
      invoice_logo_url: fs.invoice_logo_url,
    });
    return pdf.toString('base64');
  },
};
