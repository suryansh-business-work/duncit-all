import { Types } from 'mongoose';
import { BrandPickupLocationModel } from '@modules/venues/brandPickupLocation/brandPickupLocation.model';
import { getServiceability, isShiprocketConfigured } from '@modules/commerce/shiprocket/shiprocket.gateway';
import { buildParcel, type ParcelLine } from '@modules/commerce/shiprocket/shiprocket.parcel';
import { effectiveDims } from '@modules/venues/inventory/inventory.packaging';
import { couponService } from '@modules/finance/coupon/coupon.service';
import { applyCoins, computeQuote, type QuoteBreakup } from '@modules/finance/payment/payment.service';
import { logs } from '@observability/log';
import type { IStoreSettings } from './storeSettings.model';
import { StoreProductModel } from './storeProduct.model';
import { listedFilter } from './store.catalog.service';
import {
  availableFor,
  discountPct,
  findVariant,
  listingOf,
  maxPerOrder,
  unitPriceOf,
} from './store.product';
import { badInput, round2 } from './store.shared';

/**
 * The pet store's money: a cart's lines priced from the live catalogue, its
 * shipping quoted from ShipRocket, and every discount applied in one fixed
 * order. The cart page, the checkout preview and the charge all run through
 * `priceStoreCart`, so the number a shopper saw is the number they pay.
 *
 * Order of deductions: coupon (on goods) → prepaid discount (on goods after
 * the coupon) → shipping and the COD fee are added → Duncit Coins come off
 * last. GST is then extracted inclusive from what remains, exactly like the
 * pod shop, via the shared `computeQuote`.
 */

export interface StoreLineInput {
  product_id: Types.ObjectId | string;
  variant_id: string;
  qty: number;
}

/** Why a cart line cannot be bought as it stands. */
export type StoreLineIssue = 'UNAVAILABLE' | 'VARIANT_GONE' | 'OUT_OF_STOCK' | 'QTY_REDUCED';

export interface StoreLine {
  product_id: string;
  /** Always '' — a store line belongs to no pod. The order split reads it. */
  pod_id: string;
  variant_id: string;
  variant_label: string;
  variant_sku: string;
  name: string;
  slug: string;
  image_url: string;
  brand_name: string;
  quantity: number;
  requested_qty: number;
  unit_cost: number;
  mrp: number;
  gross: number;
  available: number;
  max_qty: number;
  cod_available: boolean;
  returnable: boolean;
  warehouse_id: string;
  /** One unit's packed parcel (variant, else product) — what the courier rates. */
  weight_kg: number;
  length_cm: number;
  breadth_cm: number;
  height_cm: number;
  fulfilment_method: 'SHIP';
  issue: StoreLineIssue | null;
}

/** The asked-for products that are on the shelf right now (published), by id. */
async function loadProducts(ids: string[]) {
  const valid = [...new Set(ids)].filter((id) => Types.ObjectId.isValid(id));
  const products = await StoreProductModel.find(listedFilter({ _id: { $in: valid } })).lean();
  return new Map(products.map((p) => [String(p._id), p]));
}

function blankLine(input: StoreLineInput, issue: StoreLineIssue): StoreLine {
  return {
    product_id: String(input.product_id),
    pod_id: '',
    variant_id: input.variant_id ?? '',
    variant_label: '',
    variant_sku: '',
    name: '',
    slug: '',
    image_url: '',
    brand_name: '',
    quantity: 0,
    requested_qty: input.qty,
    unit_cost: 0,
    mrp: 0,
    gross: 0,
    available: 0,
    max_qty: 0,
    cod_available: false,
    returnable: false,
    warehouse_id: '',
    weight_kg: 0,
    length_cm: 0,
    breadth_cm: 0,
    height_cm: 0,
    fulfilment_method: 'SHIP',
    issue,
  };
}

function buildLine(input: StoreLineInput, p: any, settings: IStoreSettings): StoreLine {
  const variantId = String(input.variant_id ?? '');
  const hasVariants = (p.variants ?? []).length > 0;
  const variant = findVariant(p, variantId);
  if (hasVariants && !variant) return { ...blankLine(input, 'VARIANT_GONE'), name: p.product_name };
  const listing = listingOf(p);
  const { price, mrp } = unitPriceOf(p, variant);
  const available = availableFor(p, variant);
  const maxQty = Math.max(0, Math.min(maxPerOrder(p, settings.max_qty_per_line), available));
  const requested = Math.max(1, Math.floor(Number(input.qty) || 1));
  const quantity = Math.min(requested, maxQty);
  let issue: StoreLineIssue | null = null;
  if (available <= 0) issue = 'OUT_OF_STOCK';
  else if (quantity < requested) issue = 'QTY_REDUCED';
  const image = [...(variant?.images ?? []), ...(p.images ?? [])].find(Boolean) ?? '';
  return {
    product_id: String(p._id),
    pod_id: '',
    variant_id: variant ? String(variant._id) : '',
    variant_label: variant?.option_label ?? '',
    variant_sku: variant?.sku ?? '',
    name: listing.title || p.product_name,
    slug: listing.slug,
    image_url: image,
    brand_name: p.brand_name ?? '',
    quantity,
    requested_qty: requested,
    unit_cost: price,
    mrp,
    gross: round2(price * quantity),
    available,
    max_qty: maxQty,
    cod_available: listing.cod_available,
    returnable: listing.returnable,
    warehouse_id: p.pickup_location_id ? String(p.pickup_location_id) : '',
    ...effectiveDims(p, variant),
    fulfilment_method: 'SHIP',
    issue,
  };
}

/** Price every cart line against the live catalogue. Lines are never dropped —
 * an unbuyable one comes back with its `issue` so the cart can explain it. */
export async function resolveStoreLines(items: StoreLineInput[], settings: IStoreSettings): Promise<StoreLine[]> {
  const byId = await loadProducts(items.map((i) => String(i.product_id)));
  return items.map((item) => {
    const product = byId.get(String(item.product_id));
    if (!product) return blankLine(item, 'UNAVAILABLE');
    return buildLine(item, product, settings);
  });
}

/** Checkout accepts only lines that can be bought exactly as asked. */
export function assertBuyable(lines: StoreLine[]) {
  if (lines.length === 0) badInput('Your cart is empty');
  const bad = lines.find((l) => l.issue);
  if (!bad) return;
  const name = bad.name || 'An item in your cart';
  if (bad.issue === 'QTY_REDUCED') badInput(`Only ${bad.max_qty} of ${name} can be ordered right now`);
  if (bad.issue === 'OUT_OF_STOCK') badInput(`${name} is out of stock`);
  badInput(`${name} is no longer available`);
}

export interface StoreShipLine {
  pod_id: string;
  warehouse_id: string;
  pickup_pincode: string;
  courier_name: string;
  charge: number;
  quoted: boolean;
  free: boolean;
  etd: string;
}

export interface StoreShipQuote {
  total: number;
  breakup: StoreShipLine[];
  all_quoted: boolean;
  /** False only when the courier answered and said it cannot reach the pincode. */
  serviceable: boolean;
  cod_serviceable: boolean;
  etd: string;
}

/** One warehouse's parcel and the value of the goods in it. */
interface ShipGroup {
  warehouse_id: string;
  lines: ParcelLine[];
  value: number;
}

async function quoteGroup(
  group: ShipGroup,
  pickup: string,
  pincode: string,
  opts: { free: boolean; cod: boolean; flatFee: number; configured: boolean }
): Promise<StoreShipLine & { reachable: boolean; codReachable: boolean }> {
  const base = {
    pod_id: '',
    warehouse_id: group.warehouse_id,
    pickup_pincode: pickup,
    courier_name: '',
    charge: opts.free ? 0 : round2(opts.flatFee),
    quoted: false,
    free: opts.free,
    etd: '',
    reachable: true,
    codReachable: true,
  };
  if (!opts.configured || !pickup || !/^\d{6}$/.test(pincode)) return base;
  try {
    const parcel = buildParcel(group.lines);
    const lane = {
      pickupPincode: pickup,
      deliveryPincode: pincode,
      weightKg: parcel.weight_kg,
      lengthCm: parcel.length_cm,
      breadthCm: parcel.breadth_cm,
      heightCm: parcel.height_cm,
      declaredValue: group.value,
    };
    const [prepaid, cod] = await Promise.all([
      getServiceability(lane),
      opts.cod ? getServiceability({ ...lane, cod: true }) : null,
    ]);
    if (!prepaid) return { ...base, reachable: false, codReachable: false };
    return {
      ...base,
      courier_name: prepaid.courier_name,
      charge: opts.free ? 0 : round2((opts.cod ? cod?.freight_charge : undefined) ?? prepaid.freight_charge),
      quoted: true,
      etd: prepaid.etd,
      codReachable: !opts.cod || !!cod,
    };
  } catch (error) {
    logs.server.warn('store', 'quoteShipping', { error, msg: 'serviceability failed; flat fee used' });
    return base;
  }
}

/**
 * Quote delivery for store lines: one parcel per Duncit warehouse, rated live by
 * ShipRocket, the store's flat fee when the courier cannot be asked, and free
 * above the store's threshold.
 */
export async function quoteStoreShipping(
  lines: StoreLine[],
  pincode: string,
  settings: IStoreSettings,
  opts: { goodsTotal: number; cod: boolean }
): Promise<StoreShipQuote> {
  const groups = new Map<string, ShipGroup>();
  for (const line of lines.filter((l) => l.quantity > 0)) {
    const g = groups.get(line.warehouse_id) ?? { warehouse_id: line.warehouse_id, lines: [], value: 0 };
    g.lines.push({ qty: line.quantity, weight_kg: line.weight_kg, length_cm: line.length_cm, breadth_cm: line.breadth_cm, height_cm: line.height_cm });
    g.value = round2(g.value + line.gross);
    groups.set(line.warehouse_id, g);
  }
  if (groups.size === 0) {
    return { total: 0, breakup: [], all_quoted: true, serviceable: true, cod_serviceable: true, etd: '' };
  }
  const ids = [...groups.keys()].filter((id) => Types.ObjectId.isValid(id));
  const warehouses = await BrandPickupLocationModel.find({ _id: { $in: ids } }).select('pincode').lean();
  const pinById = new Map(warehouses.map((w) => [String(w._id), String(w.pincode ?? '')]));
  const free = settings.free_shipping_above > 0 && opts.goodsTotal >= settings.free_shipping_above;
  const configured = await isShiprocketConfigured();
  const cleanPin = String(pincode ?? '').replaceAll(/\D/g, '');
  const quoted = await Promise.all(
    [...groups.values()].map((g) =>
      quoteGroup(g, pinById.get(g.warehouse_id) ?? '', cleanPin, {
        free,
        cod: opts.cod,
        flatFee: settings.flat_shipping_fee,
        configured,
      })
    )
  );
  // A warehouse-less group ('' id) ships through the account's default pickup,
  // whose split charge is only ever the flat fee — recorded per group so each
  // order carries exactly its own parcel's charge.
  const breakup = quoted.map(({ reachable: _r, codReachable: _c, ...line }) => line);
  return {
    total: round2(breakup.reduce((s, l) => s + l.charge, 0)),
    breakup,
    all_quoted: breakup.every((l) => l.quoted),
    serviceable: quoted.every((q) => q.reachable),
    cod_serviceable: quoted.every((q) => q.codReachable),
    etd: quoted.map((q) => q.etd).find(Boolean) ?? '',
  };
}

export type StorePaymentMethod = 'PREPAID' | 'COD';

/** Why COD is not on offer for this basket — the storefront words each one. */
export type CodBlock =
  | 'DISABLED'
  | 'PRODUCT'
  | 'PINCODE'
  | 'MIN_ORDER'
  | 'MAX_ORDER'
  | 'NOT_SERVICEABLE'
  | null;

export interface StoreQuoteInput {
  lines: StoreLine[];
  settings: IStoreSettings;
  pincode: string;
  paymentMethod: StorePaymentMethod;
  couponCode?: string | null;
  redeemCoins?: number | null;
  userId?: string | null;
  email?: string | null;
  /** An Autoship cycle (or its "Order now"): this product line earns `pct` off. */
  autoship?: AutoshipDiscount | null;
}

export interface AutoshipDiscount {
  product_id: string;
  variant_id: string;
  pct: number;
}

export interface StoreQuote {
  lines: StoreLine[];
  items_total: number;
  mrp_total: number;
  savings: number;
  coupon_code: string | null;
  coupon_discount: number;
  coupon_error: string | null;
  prepaid_discount: number;
  autoship_discount: number;
  shipping: StoreShipQuote;
  cod_fee: number;
  coins_redeemed: number;
  discount_total: number;
  original_total: number;
  quote: QuoteBreakup;
  cod_block: CodBlock;
  below_minimum: boolean;
}

function codBlockFor(input: StoreQuoteInput, payable: number, shipping: StoreShipQuote): CodBlock {
  const s = input.settings;
  if (!s.cod_enabled) return 'DISABLED';
  if (input.lines.some((l) => !l.cod_available)) return 'PRODUCT';
  if (s.cod_blocked_pincodes.includes(String(input.pincode ?? '').trim())) return 'PINCODE';
  if (s.cod_min_order > 0 && payable < s.cod_min_order) return 'MIN_ORDER';
  if (s.cod_max_order > 0 && payable > s.cod_max_order) return 'MAX_ORDER';
  if (!shipping.cod_serviceable) return 'NOT_SERVICEABLE';
  return null;
}

/** Evaluate a coupon on the goods; a bad code is reported, never thrown here. */
async function couponOn(input: StoreQuoteInput, itemsTotal: number) {
  const code = String(input.couponCode ?? '').trim();
  if (!code) return { code: null, discount: 0, error: null };
  const result = await couponService.evaluate(code, null, itemsTotal, input.userId ?? null, {
    channel: 'STORE',
    email: input.email ?? null,
  });
  if (!result.ok) return { code: null, discount: 0, error: result.message ?? 'Invalid coupon' };
  return { code: result.coupon!.code, discount: round2(itemsTotal - result.final_total), error: null };
}

/** Whole rupees off the subscribed line(s) of an Autoship basket. */
function autoshipDiscountOn(lines: StoreLine[], autoship: AutoshipDiscount | null | undefined): number {
  if (!autoship || autoship.pct <= 0) return 0;
  const gross = lines
    .filter((l) => l.product_id === autoship.product_id && l.variant_id === autoship.variant_id)
    .reduce((sum, l) => sum + l.gross, 0);
  return Math.floor((gross * autoship.pct) / 100);
}

export async function priceStoreCart(input: StoreQuoteInput): Promise<StoreQuote> {
  const s = input.settings;
  const buyable = input.lines.filter((l) => l.quantity > 0 && l.issue !== 'UNAVAILABLE' && l.issue !== 'VARIANT_GONE');
  const itemsTotal = round2(buyable.reduce((sum, l) => sum + l.gross, 0));
  const mrpTotal = round2(buyable.reduce((sum, l) => sum + (l.mrp || l.unit_cost) * l.quantity, 0));
  const coupon = await couponOn(input, itemsTotal);
  const afterCoupon = round2(itemsTotal - coupon.discount);
  const cod = input.paymentMethod === 'COD';
  const prepaidDiscount =
    !cod && s.prepaid_discount_pct > 0 ? Math.floor((afterCoupon * s.prepaid_discount_pct) / 100) : 0;
  // Never more than what is left of the goods after the other two.
  const autoshipDiscount = Math.min(
    autoshipDiscountOn(buyable, input.autoship),
    Math.max(0, Math.floor(afterCoupon - prepaidDiscount))
  );
  const shipping = await quoteStoreShipping(buyable, input.pincode, s, { goodsTotal: itemsTotal, cod });
  const codFee = cod ? round2(s.cod_fee) : 0;
  const payable = round2(afterCoupon - prepaidDiscount - autoshipDiscount + shipping.total + codFee);
  const baseQuote = await computeQuote(payable);
  const coins =
    input.userId && Number(input.redeemCoins) > 0
      ? await applyCoins(input.redeemCoins, input.userId, baseQuote)
      : { quote: baseQuote, coinsRedeemed: 0 };
  const original = round2(itemsTotal + shipping.total + codFee);
  return {
    lines: input.lines,
    items_total: itemsTotal,
    mrp_total: mrpTotal,
    savings: round2(mrpTotal - itemsTotal),
    coupon_code: coupon.code,
    coupon_discount: coupon.discount,
    coupon_error: coupon.error,
    prepaid_discount: prepaidDiscount,
    autoship_discount: autoshipDiscount,
    shipping,
    cod_fee: codFee,
    coins_redeemed: coins.coinsRedeemed,
    discount_total: round2(coupon.discount + prepaidDiscount + autoshipDiscount + coins.coinsRedeemed),
    original_total: original,
    quote: coins.quote,
    cod_block: codBlockFor(input, payable, shipping),
    below_minimum: s.min_order_value > 0 && itemsTotal < s.min_order_value,
  };
}

/** The storefront shape of a priced line. */
export const lineOut = (l: StoreLine) => ({
  product_id: l.product_id,
  variant_id: l.variant_id,
  variant_label: l.variant_label,
  name: l.name,
  slug: l.slug,
  image_url: l.image_url,
  brand_name: l.brand_name,
  quantity: l.quantity,
  requested_qty: l.requested_qty,
  unit_price: l.unit_cost,
  mrp: l.mrp,
  discount_pct: discountPct(l.unit_cost, l.mrp),
  line_total: l.gross,
  available: l.available,
  max_qty: l.max_qty,
  cod_available: l.cod_available,
  issue: l.issue,
});
