import { Types } from 'mongoose';
import type { GraphQLContext } from '@context';
import { requireAuth } from '@middleware/rbac';
import { logs } from '@observability/log';
import { getUrlConfigs } from '@config/url-configs';
import { sendEmail } from '@services/email/email.service';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { UserModel } from '@modules/access/user/user.model';
import { InventoryProductModel } from '@modules/venues/inventory/inventory.model';
import { ProductOrderModel } from '@modules/commerce/productOrder/productOrder.model';
import { buildBuyerFields } from '@modules/finance/payment/payment.service';
import {
  STORE_SUBSCRIPTION_MODES,
  STORE_SUBSCRIPTION_STATUSES,
  StoreSubscriptionModel,
  type IStoreSubscription,
  type StoreSubscriptionMode,
  type StoreSubscriptionStatus,
} from './storeSubscription.model';
import { getStoreSettings, type IStoreSettings } from './storeSettings.model';
import { cardsFor, listedFilter } from './store.catalog.service';
import { storeCartService } from './store.cart.service';
import {
  bookCodPayment,
  cleanAddress,
  cleanContact,
  consumeCodProof,
  draftStorePayment,
} from './store.checkout.service';
import { assertBuyable, priceStoreCart, resolveStoreLines } from './store.pricing';
import { findVariant, listingOf, maxPerOrder, unitPriceOf } from './store.product';
import { badInput, iso, notFound, toObjectId } from './store.shared';

/**
 * Autoship — the buyer's subscriptions, the console's view of them, and the
 * runner that books each due cycle. A cycle is an ordinary store order: the
 * same pricing (plus the autoship discount), the same payment row, the same
 * finalizer. Only the trigger differs.
 */

const WEEK_MS = 7 * 86_400_000;
const DAY_MS = 86_400_000;
const MAX_FAILURES = 3;
const MAX_EVENTS = 50;

type SubInput = {
  product_id: string;
  variant_id?: string | null;
  qty: number;
  frequency_weeks: number;
  mode: StoreSubscriptionMode;
  contact: { name: string; email: string; phone_extension: string; phone_number: string };
  shipping_address: Parameters<typeof cleanAddress>[0];
  cod_challenge_id?: string | null;
};

type SubUpdate = Partial<Pick<SubInput, 'qty' | 'frequency_weeks' | 'mode' | 'shipping_address' | 'cod_challenge_id'>>;

const pushEvent = (sub: IStoreSubscription, action: string, note = '') => {
  sub.events.push({ action, note: note.slice(0, 500), at: new Date() });
  if (sub.events.length > MAX_EVENTS) sub.events.splice(0, sub.events.length - MAX_EVENTS);
};

function assertAutoship(settings: IStoreSettings) {
  if (!settings.autoship_enabled) badInput('Autoship is not available right now');
}

function assertFrequency(weeks: number, settings: IStoreSettings) {
  const allowed = settings.autoship_frequencies;
  const ok = allowed.length > 0 ? allowed.includes(weeks) : weeks >= 1 && weeks <= 26;
  if (!Number.isInteger(weeks) || !ok) badInput('Choose how often it should arrive');
}

/** A COD_AUTO subscription books cash orders on its own — prove the phone once. */
async function assertCodAllowed(settings: IStoreSettings, codAvailable: boolean, challengeId: string | null | undefined, phone: string) {
  if (!settings.cod_enabled || !codAvailable) badInput('Automatic Cash on Delivery is not available for this product');
  if (settings.cod_requires_otp) await consumeCodProof(challengeId, phone);
}

async function ownSub(ctx: GraphQLContext, id: string) {
  const user = requireAuth(ctx);
  const sub = await StoreSubscriptionModel.findOne({ _id: toObjectId(id), user_id: new Types.ObjectId(user.id) });
  if (!sub) notFound('Subscription not found');
  return sub;
}

/** The subscription as its buyer reads it, product card and live price included. */
async function subsOut(subs: IStoreSubscription[], settings: IStoreSettings) {
  const products = await InventoryProductModel.find({ _id: { $in: subs.map((s) => s.product_id) } }).lean();
  const listed = await InventoryProductModel.find(await listedFilter({ _id: { $in: subs.map((s) => s.product_id) } }))
    .select('_id')
    .lean();
  const listedIds = new Set(listed.map((p) => String(p._id)));
  const cards = await cardsFor(products.filter((p) => listedIds.has(String(p._id))));
  const cardById = new Map(cards.map((c) => [c.id, c]));
  const productById = new Map(products.map((p) => [String(p._id), p]));
  return subs.map((s) => {
    const product = productById.get(String(s.product_id));
    const variant = product ? findVariant(product as any, s.variant_id ?? '') : null;
    return {
      id: String(s._id),
      product: cardById.get(String(s.product_id)) ?? null,
      product_id: String(s.product_id),
      variant_id: s.variant_id ?? '',
      variant_label: s.variant_label ?? '',
      qty: s.qty,
      frequency_weeks: s.frequency_weeks,
      mode: s.mode,
      status: s.status,
      next_run_at: iso(s.next_run_at),
      last_run_at: iso(s.last_run_at),
      last_order_no: s.last_order_no ?? '',
      run_count: s.run_count ?? 0,
      unit_price: product ? unitPriceOf(product as any, variant).price : 0,
      discount_pct: settings.autoship_enabled ? settings.autoship_discount_pct : 0,
      shipping_address: s.shipping_address ?? null,
      events: (s.events ?? []).map((e) => ({ action: e.action, note: e.note ?? '', at: iso(e.at) ?? '' })),
      created_at: iso(s.created_at) ?? '',
    };
  });
}

const adminRow = (s: IStoreSubscription) => ({
  id: String(s._id),
  buyer_name: s.buyer_name,
  buyer_email: s.buyer_email,
  product_id: String(s.product_id),
  product_name: s.product_name,
  variant_label: s.variant_label ?? '',
  qty: s.qty,
  frequency_weeks: s.frequency_weeks,
  mode: s.mode,
  status: s.status,
  next_run_at: iso(s.next_run_at),
  last_run_at: iso(s.last_run_at),
  last_order_no: s.last_order_no ?? '',
  run_count: s.run_count ?? 0,
  failures: s.failures ?? 0,
  created_at: iso(s.created_at) ?? '',
});

const SUBSCRIPTION_TABLE: TableEntityConfig = {
  searchFields: ['buyer_name', 'buyer_email', 'product_name', 'last_order_no'],
  sortFields: {
    buyer_name: 'buyer_name',
    product_name: 'product_name',
    frequency_weeks: 'frequency_weeks',
    next_run_at: 'next_run_at',
    run_count: 'run_count',
    status: 'status',
    created_at: 'created_at',
  },
  filterFields: {
    status: { type: 'enum' },
    mode: { type: 'enum' },
    buyer_email: { type: 'string' },
    next_run_at: { type: 'date' },
    created_at: { type: 'date' },
  },
  defaultSort: { next_run_at: 1, _id: 1 },
};

/** The product a subscription may be for: on the shelf, with its variant. */
async function sellableProduct(productId: string, variantId: string) {
  const product = await InventoryProductModel.findOne(await listedFilter({ _id: toObjectId(productId) })).lean();
  if (!product) badInput('This product is not available for Autoship');
  const variant = findVariant(product as any, variantId);
  if ((product.variants ?? []).length > 0 && !variant) badInput('Choose an option first');
  return { product, variant };
}

/* ------------------------------------------------------------------ *
 * One due cycle
 * ------------------------------------------------------------------ */

/** Book this cycle's Cash-on-Delivery order. Throws with a reason the buyer can read. */
async function bookCycle(sub: IStoreSubscription, settings: IStoreSettings): Promise<string> {
  if (!settings.store_enabled) throw new Error('The store is closed');
  if (!settings.cod_enabled) throw new Error('Cash on Delivery is switched off');
  const lines = await resolveStoreLines(
    [{ product_id: sub.product_id, variant_id: sub.variant_id ?? '', qty: sub.qty }],
    settings
  );
  assertBuyable(lines);
  const address = cleanAddress(sub.shipping_address);
  const quote = await priceStoreCart({
    lines,
    settings,
    pincode: address.pincode,
    paymentMethod: 'COD',
    userId: String(sub.user_id),
    email: sub.buyer_email,
    autoship: { product_id: String(sub.product_id), variant_id: sub.variant_id ?? '', pct: settings.autoship_discount_pct },
  });
  if (!quote.shipping.serviceable) throw new Error('We cannot deliver to this address');
  if (quote.cod_block) throw new Error('Cash on Delivery is not available for this order');
  const user = await UserModel.findById(sub.user_id);
  if (!user) throw new Error('The account behind this subscription no longer exists');
  const buyerFields = buildBuyerFields(
    {
      contact_name: sub.buyer_name,
      contact_email: sub.buyer_email,
      contact_phone_extension: sub.phone_extension,
      contact_phone_number: sub.phone_number,
      billing: { ...address, email: sub.buyer_email, gstin: '' },
    },
    user
  );
  const draft = draftStorePayment({
    userId: user._id,
    buyerFields,
    quote,
    method: 'COD',
    ownerKey: `u:${String(sub.user_id)}`,
    address,
    checkoutUrl: '',
    description: `Autoship · ${sub.product_name}`,
    extraFacts: { autoship_id: String(sub._id) },
  });
  const payment = await bookCodPayment(draft, 'storeAutoship');
  const order = await ProductOrderModel.findOne({ payment_id: payment._id }).select('order_no').lean();
  return order?.order_no ?? payment.payment_id;
}

async function remind(sub: IStoreSubscription) {
  const { ecommUrl } = await getUrlConfigs();
  await sendEmail({
    to: sub.buyer_email,
    subject: `Time for your next ${sub.product_name}`,
    template: 'store-autoship-due',
    category: 'transactional',
    vars: {
      name: sub.buyer_name.split(/\s+/)[0] || 'there',
      product_name: sub.product_name,
      qty: String(sub.qty),
      frequency: String(sub.frequency_weeks),
      autoship_url: `${ecommUrl.replace(/\/+$/, '')}/autoship`,
    },
  });
}

async function runOne(sub: IStoreSubscription, settings: IStoreSettings) {
  const now = Date.now();
  if (sub.mode === 'REMIND') {
    if (sub.reminded_for?.getTime() !== sub.next_run_at?.getTime()) {
      await remind(sub).catch((error) => logs.server.warn('store', 'autoshipRemind', { error, id: String(sub._id) }));
      pushEvent(sub, 'REMINDED');
    }
    sub.reminded_for = sub.next_run_at;
    sub.next_run_at = new Date(now + sub.frequency_weeks * WEEK_MS);
    await sub.save();
    return;
  }
  try {
    const orderNo = await bookCycle(sub, settings);
    sub.last_order_no = orderNo;
    sub.last_run_at = new Date();
    sub.run_count += 1;
    sub.failures = 0;
    sub.next_run_at = new Date(now + sub.frequency_weeks * WEEK_MS);
    pushEvent(sub, 'ORDERED', orderNo);
  } catch (error) {
    sub.failures += 1;
    pushEvent(sub, 'FAILED', (error as Error).message ?? 'Could not place the order');
    if (sub.failures >= MAX_FAILURES) {
      sub.status = 'PAUSED';
      pushEvent(sub, 'PAUSED', 'Paused after repeated failures');
    } else {
      sub.next_run_at = new Date(now + DAY_MS);
    }
  }
  await sub.save();
}

export const storeAutoshipService = {
  async mine(ctx: GraphQLContext) {
    const user = requireAuth(ctx);
    const subs = await StoreSubscriptionModel.find({ user_id: new Types.ObjectId(user.id) }).sort({
      status: 1,
      next_run_at: 1,
    });
    return subsOut(subs, await getStoreSettings());
  },

  async create(ctx: GraphQLContext, input: SubInput) {
    const user = requireAuth(ctx);
    const settings = await getStoreSettings();
    assertAutoship(settings);
    const frequency = Math.floor(Number(input.frequency_weeks));
    assertFrequency(frequency, settings);
    const contact = cleanContact(input.contact);
    const address = cleanAddress(input.shipping_address);
    const variantId = String(input.variant_id ?? '');
    const { product, variant } = await sellableProduct(input.product_id, variantId);
    const qty = Math.floor(Number(input.qty) || 0);
    if (qty < 1 || qty > maxPerOrder(product as any, settings.max_qty_per_line)) badInput('Choose a valid quantity');
    const mode: StoreSubscriptionMode = STORE_SUBSCRIPTION_MODES.includes(input.mode) ? input.mode : 'REMIND';
    if (mode === 'COD_AUTO') {
      await assertCodAllowed(settings, listingOf(product).cod_available, input.cod_challenge_id, contact.phone_number);
    }
    const now = Date.now();
    const sub = new StoreSubscriptionModel({
      user_id: new Types.ObjectId(user.id),
      buyer_name: contact.name,
      buyer_email: contact.email,
      phone_extension: contact.phone_extension,
      phone_number: contact.phone_number,
      product_id: product._id,
      variant_id: variant ? String(variant._id) : '',
      variant_label: variant?.option_label ?? '',
      product_name: listingOf(product).title || product.product_name,
      qty,
      frequency_weeks: frequency,
      mode,
      status: 'ACTIVE',
      shipping_address: address,
      // An automatic subscription books its first order on the next sweep; a
      // reminder one starts a cycle from now (the buyer checks out the first).
      next_run_at: new Date(mode === 'COD_AUTO' ? now : now + frequency * WEEK_MS),
    });
    pushEvent(sub, 'CREATED');
    await sub.save();
    const [out] = await subsOut([sub], settings);
    return out;
  },

  async update(ctx: GraphQLContext, id: string, input: SubUpdate) {
    const sub = await ownSub(ctx, id);
    if (sub.status === 'CANCELLED') badInput('This subscription has been cancelled');
    const settings = await getStoreSettings();
    if (input.frequency_weeks != null) {
      const frequency = Math.floor(Number(input.frequency_weeks));
      assertFrequency(frequency, settings);
      sub.frequency_weeks = frequency;
    }
    if (input.qty != null) {
      const qty = Math.floor(Number(input.qty));
      if (qty < 1 || qty > 99) badInput('Choose a valid quantity');
      sub.qty = qty;
    }
    if (input.shipping_address) sub.shipping_address = cleanAddress(input.shipping_address);
    if (input.mode && input.mode !== sub.mode) {
      if (input.mode === 'COD_AUTO') {
        const { product } = await sellableProduct(String(sub.product_id), sub.variant_id ?? '');
        await assertCodAllowed(settings, listingOf(product).cod_available, input.cod_challenge_id, sub.phone_number);
      }
      sub.mode = input.mode;
    }
    pushEvent(sub, 'UPDATED');
    await sub.save();
    const [out] = await subsOut([sub], settings);
    return out;
  },

  async pause(ctx: GraphQLContext, id: string, paused: boolean) {
    const sub = await ownSub(ctx, id);
    if (sub.status === 'CANCELLED') badInput('This subscription has been cancelled');
    sub.status = paused ? 'PAUSED' : 'ACTIVE';
    if (!paused) {
      sub.failures = 0;
      if (!sub.next_run_at || sub.next_run_at.getTime() < Date.now()) sub.next_run_at = new Date();
    }
    pushEvent(sub, paused ? 'PAUSED' : 'RESUMED');
    await sub.save();
    const [out] = await subsOut([sub], await getStoreSettings());
    return out;
  },

  async skip(ctx: GraphQLContext, id: string) {
    const sub = await ownSub(ctx, id);
    if (sub.status !== 'ACTIVE') badInput('Only an active subscription can skip a delivery');
    const from = Math.max(sub.next_run_at?.getTime() ?? Date.now(), Date.now());
    sub.next_run_at = new Date(from + sub.frequency_weeks * WEEK_MS);
    pushEvent(sub, 'SKIPPED');
    await sub.save();
    const [out] = await subsOut([sub], await getStoreSettings());
    return out;
  },

  async cancel(ctx: GraphQLContext, id: string) {
    const sub = await ownSub(ctx, id);
    sub.status = 'CANCELLED';
    sub.next_run_at = null;
    pushEvent(sub, 'CANCELLED');
    await sub.save();
    const [out] = await subsOut([sub], await getStoreSettings());
    return out;
  },

  /** Put this delivery in the cart for a normal checkout (pass autoship_id there). */
  async orderNow(ctx: GraphQLContext, id: string, cartToken?: string | null) {
    const sub = await ownSub(ctx, id);
    if (sub.status === 'CANCELLED') badInput('This subscription has been cancelled');
    return storeCartService.add(ctx, cartToken, String(sub.product_id), sub.variant_id ?? '', sub.qty);
  },

  table(query?: TableQueryInput | null) {
    return runTableQuery<IStoreSubscription>(StoreSubscriptionModel, {}, query, SUBSCRIPTION_TABLE).then(
      ({ docs, total, page, page_size }) => ({ rows: docs.map(adminRow), total, page, page_size })
    );
  },

  async adminSetStatus(id: string, status: StoreSubscriptionStatus) {
    if (!STORE_SUBSCRIPTION_STATUSES.includes(status)) badInput('Unknown status');
    const sub = await StoreSubscriptionModel.findById(toObjectId(id));
    if (!sub) notFound('Subscription not found');
    sub.status = status;
    if (status === 'CANCELLED') sub.next_run_at = null;
    if (status === 'ACTIVE') {
      sub.failures = 0;
      if (!sub.next_run_at || sub.next_run_at.getTime() < Date.now()) sub.next_run_at = new Date();
    }
    pushEvent(sub, `ADMIN_${status}`);
    await sub.save();
    return adminRow(sub);
  },

  /** Book (or remind) every cycle that is due. Returns how many were handled. */
  async runDue(limit = 100) {
    const settings = await getStoreSettings();
    if (!settings.autoship_enabled) return 0;
    const due = await StoreSubscriptionModel.find({ status: 'ACTIVE', next_run_at: { $lte: new Date() } })
      .sort({ next_run_at: 1 })
      .limit(limit);
    for (const sub of due) {
      await runOne(sub, settings).catch((error) =>
        logs.server.error('store', 'autoshipRun', { error, id: String(sub._id) })
      );
    }
    return due.length;
  },
};
