import { logs } from '@duncit/logs';
import type { FoodCartQuantities } from '@duncit/utils';

import { getItem, setItem } from '@/services/secure-storage';

/**
 * What the device remembers about ordering food at a venue: the cart per venue
 * (leaving the screen must not empty it) with the coupon applied to it, the
 * details last ordered with, and
 * the orders placed — each with the key that proves it is the member's, and the
 * key its payment can be reopened with. RN twin of mWeb's food/foodStorage,
 * on the app's own key/value store (so every read is async).
 *
 * Storage can fail, so every read and write is guarded: ordering works without
 * it, it just forgets.
 */

const CART_KEY = 'duncit.food_cart.';
const COUPON_KEY = 'duncit.food_coupon.';
const GUEST_KEY = 'duncit.food_guest';
const ORDERS_KEY = 'duncit.food_orders';
/** Orders kept on the device; the oldest fall off. */
const MAX_ORDERS = 10;
/** How long a placed order still earns the menu's "Track your order" link. */
const TRACK_WINDOW_MS = 12 * 60 * 60 * 1000;

export interface FoodGuestDetails {
  name: string;
  phone: string;
}

export interface StoredFoodOrder {
  order_id: string;
  venue_id: string;
  order_no: string;
  access_key: string;
  /** The checkout attempt's key — repeating it reopens the same payment. Empty for an order opened from a link. */
  client_key: string;
  saved_at: number;
  /** Served, cancelled or failed: no longer worth a "Track your order" link. */
  finished: boolean;
}

async function read(key: string): Promise<unknown> {
  try {
    const raw = await getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logs.mobileApp.warn('venueFood', 'storageRead', { error, key });
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await setItem(key, JSON.stringify(value));
  } catch (error) {
    logs.mobileApp.warn('venueFood', 'storageWrite', { error, key });
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The stored cart of one venue. Its shape is not trusted — `reconcileFoodCart` checks every entry against the menu. */
export async function readFoodCart(venueId: string): Promise<FoodCartQuantities> {
  const stored = await read(`${CART_KEY}${venueId}`);
  if (!isRecord(stored)) return {};
  const cart: FoodCartQuantities = {};
  for (const [id, quantity] of Object.entries(stored)) {
    if (typeof quantity === 'number') cart[id] = quantity;
  }
  return cart;
}

export const writeFoodCart = (venueId: string, cart: FoodCartQuantities): Promise<void> =>
  write(`${CART_KEY}${venueId}`, cart);

/**
 * The venue's coupon applied to a cart, as the server's preview accepted it —
 * `priceFoodCart` takes it as it is. Kept beside the cart, under the venue id.
 */
export interface AppliedFoodCoupon {
  /** The code as the venue wrote it. */
  code: string;
  coupon_pct: number;
  /** Rupees of subtotal the code needs; 0 when it needs none. */
  min_order_amount: number;
}

export async function readFoodCoupon(venueId: string): Promise<AppliedFoodCoupon | null> {
  const stored = await read(`${COUPON_KEY}${venueId}`);
  if (!isRecord(stored)) return null;
  const { code, coupon_pct: pct, min_order_amount: minOrder } = stored;
  if (typeof code !== 'string' || !code || typeof pct !== 'number') return null;
  return {
    code,
    coupon_pct: pct,
    min_order_amount: typeof minOrder === 'number' ? minOrder : 0,
  };
}

/** `null` forgets the venue's coupon — it was removed, or its cart was emptied or ordered. */
export const writeFoodCoupon = (venueId: string, coupon: AppliedFoodCoupon | null): Promise<void> =>
  write(`${COUPON_KEY}${venueId}`, coupon);

export async function readFoodGuest(): Promise<FoodGuestDetails | null> {
  const stored = await read(GUEST_KEY);
  if (!isRecord(stored)) return null;
  return {
    name: typeof stored.name === 'string' ? stored.name : '',
    phone: typeof stored.phone === 'string' ? stored.phone : '',
  };
}

export const writeFoodGuest = (guest: FoodGuestDetails): Promise<void> => write(GUEST_KEY, guest);

const isStoredOrder = (value: unknown): value is StoredFoodOrder =>
  isRecord(value) &&
  typeof value.order_id === 'string' &&
  typeof value.venue_id === 'string' &&
  typeof value.access_key === 'string' &&
  typeof value.saved_at === 'number';

async function readFoodOrders(): Promise<StoredFoodOrder[]> {
  const stored = await read(ORDERS_KEY);
  return Array.isArray(stored) ? stored.filter(isStoredOrder) : [];
}

type FoodOrderToSave = Omit<StoredFoodOrder, 'saved_at' | 'finished'> & { finished?: boolean };

// Saves are read-modify-write on one key, and the checkout and the order screen
// both save the same order moments apart — so they run one after another.
let saving: Promise<void> = Promise.resolve();

/** One remembered order — read after any save still in flight, so a just-placed order is found. */
export async function readFoodOrder(orderId: string): Promise<StoredFoodOrder | null> {
  await saving;
  const orders = await readFoodOrders();
  return orders.find((order) => order.order_id === orderId) ?? null;
}

/** Remember an order, newest first. A second save of the same order keeps the client key the first one had. */
export function saveFoodOrder(order: FoodOrderToSave): Promise<void> {
  saving = saving.then(() => storeFoodOrder(order));
  return saving;
}

async function storeFoodOrder(order: FoodOrderToSave): Promise<void> {
  const orders = await readFoodOrders();
  const known = orders.find((entry) => entry.order_id === order.order_id);
  const next: StoredFoodOrder = {
    ...order,
    client_key: order.client_key || known?.client_key || '',
    saved_at: known?.saved_at ?? Date.now(),
    finished: order.finished ?? known?.finished ?? false,
  };
  const rest = orders.filter((entry) => entry.order_id !== order.order_id);
  await write(ORDERS_KEY, [next, ...rest].slice(0, MAX_ORDERS));
}

/** The member's latest order at this venue that is still in progress, if it is recent. */
export async function recentFoodOrder(venueId: string): Promise<StoredFoodOrder | null> {
  const since = Date.now() - TRACK_WINDOW_MS;
  const orders = await readFoodOrders();
  return (
    orders.find(
      (order) => order.venue_id === venueId && !order.finished && order.saved_at >= since,
    ) ?? null
  );
}
