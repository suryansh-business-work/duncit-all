import { logs } from '@duncit/logs';
import { foodOrderKeysOf, type FoodCartCoupon, type FoodCartQuantities, type VenueFoodOrderKey } from '@duncit/utils';

/**
 * What a guest's browser remembers about ordering food at a venue: the cart
 * per venue (a refresh at the table must not empty it) and the coupon applied
 * to it, the details they last
 * ordered with, and the orders they placed — each with the key that proves it
 * is theirs, so the order page reopens without the link.
 *
 * Storage can be missing, full or blocked (private mode), so every read and
 * write is guarded: the page works without it, it just forgets.
 */

const CART_KEY = 'mweb_food_cart_';
const COUPON_KEY = 'mweb_food_coupon_';
const GUEST_KEY = 'mweb_food_guest';
const ORDERS_KEY = 'mweb_food_orders';
/** Orders kept on the device; the oldest fall off. */
const MAX_ORDERS = 10;

export interface FoodGuestDetails {
  name: string;
  phone: string;
}

/** A coupon the server accepted for a venue's cart: its code and the terms the cart is priced with. */
export interface AppliedFoodCoupon extends FoodCartCoupon {
  coupon_code: string;
  min_order_amount: number;
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

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    logs.mWeb.warn('venueFood', 'storageRead', { error, key });
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    logs.mWeb.warn('venueFood', 'storageWrite', { error, key });
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The stored cart of one venue. Its shape is not trusted — `reconcileFoodCart` checks every entry against the menu. */
export function readFoodCart(venueId: string): FoodCartQuantities {
  const stored = read(`${CART_KEY}${venueId}`);
  if (!isRecord(stored)) return {};
  const cart: FoodCartQuantities = {};
  for (const [id, quantity] of Object.entries(stored)) {
    if (typeof quantity === 'number') cart[id] = quantity;
  }
  return cart;
}

export const writeFoodCart = (venueId: string, cart: FoodCartQuantities): void => write(`${CART_KEY}${venueId}`, cart);

/** The coupon kept with one venue's cart. Its terms are only what was last previewed — checkout asks the server again. */
export function readFoodCoupon(venueId: string): AppliedFoodCoupon | null {
  const stored = read(`${COUPON_KEY}${venueId}`);
  if (!isRecord(stored) || typeof stored.coupon_code !== 'string' || !stored.coupon_code) return null;
  if (typeof stored.coupon_pct !== 'number') return null;
  return {
    coupon_code: stored.coupon_code,
    coupon_pct: stored.coupon_pct,
    min_order_amount: typeof stored.min_order_amount === 'number' ? stored.min_order_amount : 0,
  };
}

export function writeFoodCoupon(venueId: string, coupon: AppliedFoodCoupon | null): void {
  const key = `${COUPON_KEY}${venueId}`;
  if (coupon) {
    write(key, coupon);
    return;
  }
  try {
    localStorage.removeItem(key);
  } catch (error) {
    logs.mWeb.warn('venueFood', 'storageRemove', { error, key });
  }
}

export function readFoodGuest(): FoodGuestDetails | null {
  const stored = read(GUEST_KEY);
  if (!isRecord(stored)) return null;
  return {
    name: typeof stored.name === 'string' ? stored.name : '',
    phone: typeof stored.phone === 'string' ? stored.phone : '',
  };
}

export const writeFoodGuest = (guest: FoodGuestDetails): void => write(GUEST_KEY, guest);

const isStoredOrder = (value: unknown): value is StoredFoodOrder =>
  isRecord(value) &&
  typeof value.order_id === 'string' &&
  typeof value.venue_id === 'string' &&
  typeof value.access_key === 'string' &&
  typeof value.saved_at === 'number';

function readFoodOrders(): StoredFoodOrder[] {
  const stored = read(ORDERS_KEY);
  return Array.isArray(stored) ? stored.filter(isStoredOrder) : [];
}

export const readFoodOrder = (orderId: string): StoredFoodOrder | null =>
  readFoodOrders().find((order) => order.order_id === orderId) ?? null;

/** Remember an order, newest first. A second save of the same order keeps the client key the first one had. */
export function saveFoodOrder(order: Omit<StoredFoodOrder, 'saved_at' | 'finished'> & { finished?: boolean }): void {
  const orders = readFoodOrders();
  const known = orders.find((entry) => entry.order_id === order.order_id);
  const next: StoredFoodOrder = {
    ...order,
    client_key: order.client_key || known?.client_key || '',
    saved_at: known?.saved_at ?? Date.now(),
    finished: order.finished ?? known?.finished ?? false,
  };
  write(ORDERS_KEY, [next, ...orders.filter((entry) => entry.order_id !== order.order_id)].slice(0, MAX_ORDERS));
}

/**
 * Every order this device remembers, with the key that proves it — what "Your Food
 * Orders" and the menu's running orders send, so the server can answer for a
 * guest with no account. The server decides which are still running.
 */
export const storedFoodOrderKeys = (): VenueFoodOrderKey[] => foodOrderKeysOf(readFoodOrders());

/** The guest order page. The access key rides in the link so it opens on another device too. */
export function foodOrderPath(venueId: string, orderId: string, accessKey?: string | null): string {
  const path = `/venue/${encodeURIComponent(venueId)}/food-order/${encodeURIComponent(orderId)}`;
  return accessKey ? `${path}?key=${encodeURIComponent(accessKey)}` : path;
}
