import { logs } from '@duncit/logs';
import type { FoodCartQuantities } from '@duncit/utils';

/**
 * What a guest's browser remembers about ordering food at a venue: the cart
 * per venue (a refresh at the table must not empty it), the details they last
 * ordered with, and the orders they placed — each with the key that proves it
 * is theirs, so the order page reopens without the link.
 *
 * Storage can be missing, full or blocked (private mode), so every read and
 * write is guarded: the page works without it, it just forgets.
 */

const CART_KEY = 'mweb_food_cart_';
const GUEST_KEY = 'mweb_food_guest';
const ORDERS_KEY = 'mweb_food_orders';
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

/** The guest's latest order at this venue that is still in progress, if it is recent. */
export function recentFoodOrder(venueId: string): StoredFoodOrder | null {
  const since = Date.now() - TRACK_WINDOW_MS;
  return (
    readFoodOrders().find((order) => order.venue_id === venueId && !order.finished && order.saved_at >= since) ?? null
  );
}

/** The guest order page. The access key rides in the link so it opens on another device too. */
export function foodOrderPath(venueId: string, orderId: string, accessKey?: string | null): string {
  const path = `/venue/${encodeURIComponent(venueId)}/food-order/${encodeURIComponent(orderId)}`;
  return accessKey ? `${path}?key=${encodeURIComponent(accessKey)}` : path;
}
