import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { foodGstPct, foodTaxMode } from '@modules/finance/finance/foodTaxDefaults';
import { PartnerIntegrationModel } from '@modules/venues/ecommBrand/partnerIntegration.model';
import {
  VENUE_FOOD_DIETS,
  VENUE_FOOD_DISCOUNT_MAX_PCT,
  VENUE_FOOD_IMAGE_LIMIT,
  VENUE_FOOD_MENU_LIMIT,
  VENUE_FOOD_PRICE_MAX,
  VENUE_FOOD_SPICE_LEVELS,
  VENUE_FOOD_TAX_DEFAULTS,
} from './venue.constants';
import type { IVenueFoodItem, IVenueFoodOrdering, VenueFoodDiet, VenueFoodSpiceLevel } from './venue.model';

/**
 * The venue's food side: "does this venue serve food", its menu, and whether
 * guests may order from it by scanning the venue QR.
 *
 * Everything here is validation and shaping — the venue service decides WHO
 * may write (owner or console editor) and saves the document. Ordering itself
 * lives in `@modules/venues/venueFood`.
 */

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const given = <T>(value: T | null | undefined): value is T => value !== undefined && value !== null;

/** The three food inputs as they arrive on a step-1 or approved-venue write. */
export interface VenueFoodInput {
  offers_food?: boolean | null;
  food_menu?: unknown[] | null;
  food_ordering?: {
    enabled?: boolean | null;
    razorpay_integration_id?: string | null;
    discount_pct?: number | null;
    tax_override?: boolean | null;
    tax_mode?: string | null;
    gst_pct?: number | null;
  } | null;
}

/** What the venue holds today — the base every partial write is laid over. */
export interface VenueFoodState {
  owner_user_id: Types.ObjectId;
  offers_food?: boolean;
  food_menu?: IVenueFoodItem[];
  food_ordering?: Partial<IVenueFoodOrdering> | null;
}

export const VENUE_FOOD_INPUT_KEYS = ['offers_food', 'food_menu', 'food_ordering'] as const;

type FoodItemDraft = Omit<IVenueFoodItem, '_id'> & { _id: Types.ObjectId };

function itemImages(raw: unknown, name: string): string[] {
  const images = (Array.isArray(raw) ? raw : []).map(text).filter(Boolean);
  if (images.length > VENUE_FOOD_IMAGE_LIMIT) bad(`"${name}" can have at most ${VENUE_FOOD_IMAGE_LIMIT} photos`);
  return [...new Set(images)];
}

function itemPrice(raw: unknown, name: string): number {
  const price = Math.round(Number(raw) * 100) / 100;
  if (!Number.isFinite(price) || price < 1 || price > VENUE_FOOD_PRICE_MAX) {
    bad(`Enter a price between 1 and ${VENUE_FOOD_PRICE_MAX} for "${name}"`);
  }
  return price;
}

function oneOf<T extends string>(raw: unknown, allowed: readonly T[], fallback: T, label: string): T {
  if (raw === undefined || raw === null || raw === '') return fallback;
  if (!allowed.includes(raw as T)) bad(`Choose a valid ${label}`);
  return raw as T;
}

function normalizeFoodItem(input: unknown, known: Map<string, Types.ObjectId>): FoodItemDraft {
  // A row as the client sent it: every field is read defensively, none is trusted.
  const raw = (input ?? {}) as Record<string, unknown>;
  const name = text(raw.name);
  if (!name) bad('Every menu item needs a name');
  if (name.length > 80) bad('Menu item names must be 80 characters or fewer');
  const description = text(raw.description);
  if (description.length > 500) bad(`Keep the description of "${name}" under 500 characters`);
  const category = text(raw.category);
  if (category.length > 40) bad(`Keep the menu section of "${name}" under 40 characters`);
  return {
    // A dish the venue already lists keeps its id; anything else is a new dish.
    _id: known.get(text(raw.id)) ?? new Types.ObjectId(),
    name,
    description,
    category,
    price: itemPrice(raw.price, name),
    images: itemImages(raw.images, name),
    diet: oneOf<VenueFoodDiet>(raw.diet, VENUE_FOOD_DIETS, 'VEG', 'food type'),
    spice_level: oneOf<VenueFoodSpiceLevel>(raw.spice_level, VENUE_FOOD_SPICE_LEVELS, 'NONE', 'spice level'),
    is_available: raw.is_available !== false,
  };
}

/** The menu as written, each row checked. Ids the venue does not own are ignored, never trusted. */
function normalizeFoodMenu(items: unknown[], current: IVenueFoodItem[]): FoodItemDraft[] {
  if (items.length > VENUE_FOOD_MENU_LIMIT) bad(`A menu can list at most ${VENUE_FOOD_MENU_LIMIT} items`);
  const known = new Map(current.map((item) => [item._id.toHexString(), item._id]));
  const menu = items.map((item) => normalizeFoodItem(item, known));
  const ids = new Set(menu.map((item) => item._id.toHexString()));
  if (ids.size !== menu.length) bad('The same menu item was sent twice');
  return menu;
}

function discountPct(raw: unknown, fallback: number): number {
  if (raw === undefined || raw === null) return fallback;
  const pct = Number(raw);
  if (!Number.isInteger(pct) || pct < 0 || pct > VENUE_FOOD_DISCOUNT_MAX_PCT) {
    bad(`The discount must be a whole number from 0 to ${VENUE_FOOD_DISCOUNT_MAX_PCT}`);
  }
  return pct;
}

/** The owner's own, working Razorpay connection — the only account a venue's orders may be charged on. */
async function ownedRazorpayConnection(id: string, ownerId: Types.ObjectId): Promise<Types.ObjectId> {
  if (!Types.ObjectId.isValid(id)) bad('Choose a valid Razorpay account');
  const connection = await PartnerIntegrationModel.findOne({ _id: id, owner_user_id: ownerId, provider: 'RAZORPAY' })
    .select('integrations.razorpay.connected')
    .lean();
  if (!connection) bad('That Razorpay account does not belong to the owner of this venue');
  if (connection?.integrations?.razorpay?.connected !== true) {
    bad('That Razorpay account has not passed its connection check yet');
  }
  return new Types.ObjectId(id);
}

/**
 * The venue's own GST, kept as stored until a write names it. A field left out
 * (or sent as null) keeps what the venue has; a sent one is checked even while
 * the override is off, so nothing invalid is ever stored for later.
 */
function foodTaxFields(input: NonNullable<VenueFoodInput['food_ordering']>, current: Partial<IVenueFoodOrdering>) {
  return {
    tax_override: input.tax_override ?? current.tax_override === true,
    tax_mode: given(input.tax_mode) ? foodTaxMode(input.tax_mode) : (current.tax_mode ?? VENUE_FOOD_TAX_DEFAULTS.tax_mode),
    gst_pct: given(input.gst_pct) ? foodGstPct(input.gst_pct) : (current.gst_pct ?? VENUE_FOOD_TAX_DEFAULTS.gst_pct),
  };
}

const storedFoodOrdering = (current: Partial<IVenueFoodOrdering>): IVenueFoodOrdering => ({
  enabled: current.enabled === true,
  razorpay_integration_id: current.razorpay_integration_id ?? null,
  discount_pct: current.discount_pct ?? 0,
  ...foodTaxFields({}, current),
});

async function normalizeFoodOrdering(
  input: NonNullable<VenueFoodInput['food_ordering']>,
  current: Partial<IVenueFoodOrdering>,
  ownerId: Types.ObjectId
): Promise<IVenueFoodOrdering> {
  const linked =
    input.razorpay_integration_id === undefined
      ? (current.razorpay_integration_id ?? null)
      : input.razorpay_integration_id && (await ownedRazorpayConnection(input.razorpay_integration_id, ownerId));
  return {
    enabled: input.enabled ?? current.enabled === true,
    razorpay_integration_id: linked || null,
    discount_pct: discountPct(input.discount_pct, current.discount_pct ?? 0),
    ...foodTaxFields(input, current),
  };
}

/** Ordering can only be on for a venue that serves food, lists a dish and has an account to be paid on. */
function assertOrderable(offersFood: boolean, menu: IVenueFoodItem[], ordering: IVenueFoodOrdering) {
  if (!ordering.enabled) return;
  if (!offersFood) bad('Turn on "offers food" before taking food orders');
  if (!menu.some((item) => item.is_available)) bad('Add at least one available menu item before taking food orders');
  if (!ordering.razorpay_integration_id) bad('Connect a Razorpay account before taking food orders');
}

/**
 * The food fields to write, or `{}` when the input carried none of them — an
 * older client (or a console that does not edit food) leaves the menu alone.
 */
export async function buildVenueFoodPatch(input: VenueFoodInput, state: VenueFoodState) {
  if (VENUE_FOOD_INPUT_KEYS.every((key) => input[key] === undefined || input[key] === null)) return {};
  const offersFood = typeof input.offers_food === 'boolean' ? input.offers_food : state.offers_food === true;
  const currentMenu = state.food_menu ?? [];
  const menu = Array.isArray(input.food_menu) ? normalizeFoodMenu(input.food_menu, currentMenu) : currentMenu;
  const currentOrdering = state.food_ordering ?? {};
  const ordering = input.food_ordering
    ? await normalizeFoodOrdering(input.food_ordering, currentOrdering, state.owner_user_id)
    : storedFoodOrdering(currentOrdering);
  // A venue that stops serving food stops taking orders; its menu is kept for when it starts again.
  if (!offersFood) ordering.enabled = false;
  assertOrderable(offersFood, menu, ordering);
  return { offers_food: offersFood, food_menu: menu, food_ordering: ordering };
}

export const toFoodItemPub = (item: IVenueFoodItem) => ({
  id: item._id.toHexString(),
  name: item.name,
  description: item.description ?? '',
  category: item.category ?? '',
  price: item.price,
  images: item.images ?? [],
  diet: item.diet ?? 'VEG',
  spice_level: item.spice_level ?? 'NONE',
  is_available: item.is_available !== false,
});

export const toVenueFoodPub = (venue: Omit<VenueFoodState, 'owner_user_id'>) => ({
  offers_food: venue.offers_food === true,
  food_menu: (venue.food_menu ?? []).map(toFoodItemPub),
  food_ordering: {
    enabled: venue.food_ordering?.enabled === true,
    razorpay_integration_id: venue.food_ordering?.razorpay_integration_id
      ? venue.food_ordering.razorpay_integration_id.toHexString()
      : null,
    razorpay_linked: Boolean(venue.food_ordering?.razorpay_integration_id),
    discount_pct: venue.food_ordering?.discount_pct ?? 0,
    // As stored. The GraphQL type resolves tax_mode and gst_pct to what the
    // venue's orders are ACTUALLY priced with (see venue.resolver), so a client
    // never has to know Finance's default.
    tax_override: venue.food_ordering?.tax_override === true,
    tax_mode: venue.food_ordering?.tax_mode ?? null,
    gst_pct: venue.food_ordering?.gst_pct ?? null,
  },
});

type VenueFoodPub = ReturnType<typeof toVenueFoodPub>;

/** What a signed-out visitor sees: no menu unless the venue serves food, and never which account is linked. */
export const redactVenueFoodForPublic = (food: VenueFoodPub): VenueFoodPub => ({
  offers_food: food.offers_food,
  food_menu: food.offers_food ? food.food_menu : [],
  food_ordering: { ...food.food_ordering, enabled: food.offers_food && food.food_ordering.enabled, razorpay_integration_id: null },
});

export const venueFoodConfig = () => ({
  food_diets: [...VENUE_FOOD_DIETS],
  food_spice_levels: [...VENUE_FOOD_SPICE_LEVELS],
  food_menu_limit: VENUE_FOOD_MENU_LIMIT,
  food_image_limit: VENUE_FOOD_IMAGE_LIMIT,
  food_price_max: VENUE_FOOD_PRICE_MAX,
  food_discount_max_pct: VENUE_FOOD_DISCOUNT_MAX_PCT,
});
