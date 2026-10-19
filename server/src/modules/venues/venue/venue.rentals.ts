import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import type { IVenueCategory } from './venue.model';

/**
 * The venue's rented items: "does this venue rent things out", and the list —
 * a racket, court shoes, a projector — each with its rate, stock and deposit.
 *
 * Validation and shaping only, the twin of `venue.food.ts`: the venue service
 * decides WHO may write and saves the document. Booking a rental, its money and
 * its deposit live in `@modules/venues/venueRental`.
 *
 * Unlike food (paid into the venue's own Razorpay), a rental is paid through
 * Duncit with the pod booking and reaches the venue, less Duncit's rental
 * commission, through the pod's settlement.
 */

/** What one rate buys: the whole pod's slot, or each hour of it. */
export type VenueRentalUnit = 'SLOT' | 'HOUR';
export const VENUE_RENTAL_UNITS: readonly VenueRentalUnit[] = ['SLOT', 'HOUR'];

export const VENUE_RENTAL_LIMITS = {
  items: 50,
  images: 6,
  rateMax: 100_000,
  depositMax: 100_000,
  /** Units of one item the venue can hand out for a single pod. */
  stockMax: 1_000,
  /** Units of one item one guest may rent for a pod. */
  perGuestMax: 20,
  /** The venue's own rental terms, as rich-text HTML. */
  termsMax: 20_000,
  /** Super → Category → Sub rows one item may be offered under. */
  categories: 20,
} as const;

export interface IVenueRentalItem {
  _id: Types.ObjectId;
  name: string;
  description: string;
  images: string[];
  unit: VenueRentalUnit;
  /** Rupees for one unit for one SLOT, or for one HOUR of the pod. */
  rate: number;
  /** Refundable deposit per unit, rupees. 0 = none. */
  deposit: number;
  /** Units available for one pod. Each pod at the venue gets the full stock. */
  stock: number;
  /** The most one guest may rent for one pod. */
  per_guest_limit: number;
  /** Off = hidden from guests and refused at checkout, without deleting it. */
  is_available: boolean;
  /**
   * The Super → Category → Sub rows the item is offered under. A pod sees the
   * item only when its club's Super + Sub category is one of them, so a venue's
   * badminton racket never shows on its book-club pods. An item with none is
   * offered to no pod (`rentalItemFitsPod`).
   */
  categories: IVenueCategory[];
}

/** Turns one picked Super → Category → Sub row into the stored triple, or refuses it (the venue's own validator). */
export type RentalCategoryResolver = (entry: unknown) => Promise<IVenueCategory>;

/** A pod's category: its club's Super + Sub (pod.products `resolveClubCategory`). */
export interface PodCategory {
  super_category_id: string | null;
  sub_category_id: string | null;
}

/**
 * Whether a pod may offer the item: one of the item's rows names the pod's
 * Super + Sub. Fails closed — a pod with no category, or an item with none,
 * offers nothing — mirroring how Pod Shop products match a pod.
 */
export function rentalItemFitsPod(item: Pick<IVenueRentalItem, 'categories'>, pod: PodCategory | null): boolean {
  if (!pod?.super_category_id || !pod.sub_category_id) return false;
  return (item.categories ?? []).some(
    (row) => String(row.super_category_id) === pod.super_category_id && String(row.sub_category_id) === pod.sub_category_id
  );
}

export interface VenueRentalInput {
  offers_rentals?: boolean | null;
  rental_items?: unknown[] | null;
  /** The venue's own rental terms (rich-text HTML), shown with Duncit's. */
  rental_terms_html?: string | null;
}

export interface VenueRentalState {
  offers_rentals?: boolean;
  rental_items?: IVenueRentalItem[];
  rental_terms_html?: string;
  /** Whether the refundable deposit is taxed with the rent. Venues console only. */
  rental_deposit_gst?: boolean;
}

export const VENUE_RENTAL_INPUT_KEYS = ['offers_rentals', 'rental_items', 'rental_terms_html'] as const;

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** A whole number within [min, max], or a refusal naming the field and item. */
function wholeIn(raw: unknown, min: number, max: number, field: string, name: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) bad(`Enter a whole ${field} from ${min} to ${max} for "${name}"`);
  return n;
}

function itemImages(raw: unknown, name: string): string[] {
  const images = [...new Set((Array.isArray(raw) ? raw : []).map(text).filter(Boolean))];
  if (images.length > VENUE_RENTAL_LIMITS.images) {
    bad(`"${name}" can have at most ${VENUE_RENTAL_LIMITS.images} photos`);
  }
  return images;
}

/**
 * The item's category rows. A client that sends none (an older app) keeps
 * what the item had; one that sends a list must name at least one row, each
 * checked against the category tree by the venue's own validator.
 */
async function itemCategories(
  raw: unknown,
  previous: IVenueCategory[],
  name: string,
  resolve: RentalCategoryResolver
): Promise<IVenueCategory[]> {
  if (!Array.isArray(raw)) return previous;
  const seen = new Set<string>();
  // First row per sub category wins: the same sub twice adds nothing.
  const rows = raw.filter((row) => {
    const sub = text((row as { sub_category_id?: unknown } | null)?.sub_category_id);
    if (sub && seen.has(sub)) return false;
    seen.add(sub);
    return true;
  });
  if (rows.length === 0) bad(`Choose at least one category for "${name}"`);
  if (rows.length > VENUE_RENTAL_LIMITS.categories) {
    bad(`"${name}" can be offered under at most ${VENUE_RENTAL_LIMITS.categories} categories`);
  }
  return Promise.all(rows.map((row) => resolve(row)));
}

function normalizeRentalItem(
  input: unknown,
  known: Map<string, IVenueRentalItem>
): Omit<IVenueRentalItem, 'categories'> {
  // Every field is read defensively; none is trusted.
  const raw = (input ?? {}) as Record<string, unknown>;
  const name = text(raw.name);
  if (!name) bad('Every rented item needs a name');
  if (name.length > 80) bad('Rented item names must be 80 characters or fewer');
  const description = text(raw.description);
  if (description.length > 500) bad(`Keep the description of "${name}" under 500 characters`);
  const unit = raw.unit === 'HOUR' ? 'HOUR' : 'SLOT';
  if (raw.unit !== undefined && raw.unit !== null && !VENUE_RENTAL_UNITS.includes(raw.unit as VenueRentalUnit)) {
    bad(`Choose how "${name}" is charged: per slot or per hour`);
  }
  const stock = wholeIn(raw.stock, 1, VENUE_RENTAL_LIMITS.stockMax, 'stock', name);
  const perGuest = wholeIn(raw.per_guest_limit ?? 1, 1, VENUE_RENTAL_LIMITS.perGuestMax, 'per-guest limit', name);
  return {
    // An item the venue already lists keeps its id, so bookings keep pointing at it.
    _id: known.get(text(raw.id))?._id ?? new Types.ObjectId(),
    name,
    description,
    images: itemImages(raw.images, name),
    unit,
    rate: wholeIn(raw.rate, 1, VENUE_RENTAL_LIMITS.rateMax, 'rate', name),
    deposit: wholeIn(raw.deposit ?? 0, 0, VENUE_RENTAL_LIMITS.depositMax, 'deposit', name),
    stock,
    per_guest_limit: Math.min(perGuest, stock),
    is_available: raw.is_available !== false,
  };
}

async function normalizeRentalItems(
  items: unknown[],
  current: IVenueRentalItem[],
  resolve: RentalCategoryResolver
): Promise<IVenueRentalItem[]> {
  if (items.length > VENUE_RENTAL_LIMITS.items) bad(`A venue can list at most ${VENUE_RENTAL_LIMITS.items} rented items`);
  const known = new Map(current.map((item) => [item._id.toHexString(), item]));
  const list = items.map((item) => normalizeRentalItem(item, known));
  if (new Set(list.map((item) => item._id.toHexString())).size !== list.length) {
    bad('The same rented item was sent twice');
  }
  return Promise.all(
    list.map(async (item, index) => ({
      ...item,
      categories: await itemCategories(
        (items[index] as { categories?: unknown } | null)?.categories,
        known.get(item._id.toHexString())?.categories ?? [],
        item.name,
        resolve
      ),
    }))
  );
}

/**
 * The rental fields to write, or `{}` when the input carried none — an older
 * client (or a console that does not edit rentals) leaves the list alone. A
 * venue that switches rentals off keeps its list for when it switches back.
 * `resolveCategory` is the venue's category validator, passed in so this file
 * stays free of the models.
 */
export async function buildVenueRentalPatch(
  input: VenueRentalInput,
  state: VenueRentalState,
  resolveCategory: RentalCategoryResolver
) {
  if (VENUE_RENTAL_INPUT_KEYS.every((key) => input[key] === undefined || input[key] === null)) return {};
  const offers = typeof input.offers_rentals === 'boolean' ? input.offers_rentals : state.offers_rentals === true;
  const current = state.rental_items ?? [];
  const items = Array.isArray(input.rental_items)
    ? await normalizeRentalItems(input.rental_items, current, resolveCategory)
    : current;
  const patch: { offers_rentals: boolean; rental_items: IVenueRentalItem[]; rental_terms_html?: string } = {
    offers_rentals: offers,
    rental_items: items,
  };
  if (typeof input.rental_terms_html === 'string') {
    const terms = input.rental_terms_html.trim();
    if (terms.length > VENUE_RENTAL_LIMITS.termsMax) {
      bad(`Keep the rental terms under ${VENUE_RENTAL_LIMITS.termsMax} characters`);
    }
    patch.rental_terms_html = terms;
  }
  return patch;
}

export const toRentalItemPub = (item: IVenueRentalItem) => ({
  id: item._id.toHexString(),
  name: item.name,
  description: item.description ?? '',
  images: item.images ?? [],
  unit: item.unit ?? 'SLOT',
  rate: item.rate,
  deposit: item.deposit ?? 0,
  stock: item.stock,
  per_guest_limit: item.per_guest_limit ?? 1,
  is_available: item.is_available !== false,
  categories: (item.categories ?? []).map((row) => ({
    super_category_id: row.super_category_id ? String(row.super_category_id) : null,
    category_id: row.category_id ? String(row.category_id) : null,
    sub_category_id: row.sub_category_id ? String(row.sub_category_id) : null,
    super_category_name: row.super_category_name ?? '',
    category_name: row.category_name ?? '',
    sub_category_name: row.sub_category_name ?? '',
  })),
});

export const toVenueRentalPub = (venue: VenueRentalState) => ({
  offers_rentals: venue.offers_rentals === true,
  rental_items: (venue.rental_items ?? []).map(toRentalItemPub),
  rental_terms_html: venue.rental_terms_html ?? '',
  rental_deposit_gst: venue.rental_deposit_gst !== false,
});

type VenueRentalPub = ReturnType<typeof toVenueRentalPub>;

/** A signed-out visitor sees only items that can be rented right now. */
export const redactVenueRentalForPublic = (pub: VenueRentalPub): VenueRentalPub => ({
  offers_rentals: pub.offers_rentals,
  rental_items: pub.offers_rentals ? pub.rental_items.filter((item) => item.is_available) : [],
  rental_terms_html: pub.offers_rentals ? pub.rental_terms_html : '',
  rental_deposit_gst: pub.rental_deposit_gst,
});

export const venueRentalConfig = () => ({
  rental_units: [...VENUE_RENTAL_UNITS],
  rental_item_limit: VENUE_RENTAL_LIMITS.items,
  rental_image_limit: VENUE_RENTAL_LIMITS.images,
  rental_rate_max: VENUE_RENTAL_LIMITS.rateMax,
  rental_deposit_max: VENUE_RENTAL_LIMITS.depositMax,
  rental_stock_max: VENUE_RENTAL_LIMITS.stockMax,
  rental_per_guest_max: VENUE_RENTAL_LIMITS.perGuestMax,
  rental_terms_max: VENUE_RENTAL_LIMITS.termsMax,
  rental_category_limit: VENUE_RENTAL_LIMITS.categories,
});
