/**
 * A venue's food MENU as its owner (or a Venues console editor) edits it — the
 * "serves food" switch, the dishes, QR ordering with its discount and GST, and
 * the GST number printed on the food invoices.
 *
 * One contract for every surface that edits it: the Partners console (its Food
 * Menu page and the venue registration form's Food section), the Venues
 * console (the record's Food Menu tab and the venue editor's Food section),
 * mWeb and the native app. The documents travel as plain strings (the web
 * parses them with `gql`, native with graphql's `parse`); the form rules are
 * `@duncit/forms/schemas` → `makeFoodMenuRefinement`.
 *
 * The server checks everything again (`venue.food.ts`) and decides who may
 * write: the owner always, a Venues console editor on the console's path.
 */

import type { VenueFoodItem } from './venue-food';

/** Who is editing: the venue's owner (Partners, mWeb, native) or a Venues console editor. */
export type FoodMenuMode = 'owner' | 'admin';

/** The menu's catalogues and caps, as `venueRegistrationConfig` serves them. */
export interface FoodMenuConfig {
  food_diets: string[];
  food_spice_levels: string[];
  food_menu_limit: number;
  food_image_limit: number;
  food_price_max: number;
  food_discount_max_pct: number;
}

/** QR ordering as the server returns it on a venue. */
export interface FoodMenuOrdering {
  enabled: boolean;
  /** The owner's saved Razorpay connection; null when none is linked. */
  razorpay_integration_id?: string | null;
  razorpay_linked: boolean;
  discount_pct: number;
  tax_override: boolean;
  tax_mode?: string | null;
  gst_pct?: number | null;
}

/** The venue fields the menu editor reads — the same selection for the owner's and the console's read. */
export interface FoodMenuVenue {
  id: string;
  venue_name: string;
  status: string;
  gstin?: string | null;
  offers_food: boolean;
  food_menu: VenueFoodItem[];
  food_ordering?: FoodMenuOrdering | null;
}

/**
 * One dish as a form holds it. `item_id` is the server's id for a dish already
 * listed ('' = new) — sent back so a saved dish keeps its identity. (Not `id`:
 * `useFieldArray` keeps that name for its own row key.) The price is kept as
 * typed; the enums as free strings, because the selects only offer what the
 * server's catalogue lists.
 */
export interface FoodDishValues {
  item_id: string;
  name: string;
  description: string;
  /** The menu heading the dish sits under — free text. */
  category: string;
  price: number | string;
  images: string[];
  diet: string;
  spice_level: string;
  is_available: boolean;
}

/**
 * QR ordering as a form holds it. `razorpay_integration_id` is what an owner
 * surface with the account picker edits; `razorpay_linked` is what every other
 * surface reads instead. The GST fields hold what the server resolved, so
 * switching the venue's own GST on starts from what it is priced with today.
 */
export interface FoodOrderingFormValues {
  enabled: boolean;
  razorpay_integration_id: string;
  razorpay_linked: boolean;
  discount_pct: number | string;
  tax_override: boolean;
  tax_mode: string;
  gst_pct: number | string;
}

/** The food block every venue form shares, under these exact names. */
export interface VenueFoodFormValues {
  offers_food: boolean;
  food_menu: FoodDishValues[];
  food_ordering: FoodOrderingFormValues;
}

/** The menu editor's whole form: the food block and the invoice GST number. */
export interface FoodMenuFormValues extends VenueFoodFormValues {
  gstin: string;
}

export const blankFoodOrdering: FoodOrderingFormValues = {
  enabled: false,
  razorpay_integration_id: '',
  razorpay_linked: false,
  discount_pct: 0,
  tax_override: false,
  tax_mode: '',
  gst_pct: '',
};

/** A new dish: available, and filed under the catalogues' first entries — the server's own defaults. */
export const blankFoodDish = (config: Pick<FoodMenuConfig, 'food_diets' | 'food_spice_levels'>): FoodDishValues => ({
  item_id: '',
  name: '',
  description: '',
  category: '',
  price: '',
  images: [],
  diet: config.food_diets[0] ?? '',
  spice_level: config.food_spice_levels[0] ?? '',
  is_available: true,
});

/** A stored dish as a form row. Tolerates a partial record (a draft venue's). */
export const foodDishToValues = (item: Partial<VenueFoodItem>): FoodDishValues => ({
  item_id: item.id ?? '',
  name: item.name ?? '',
  description: item.description ?? '',
  category: item.category ?? '',
  price: item.price ?? '',
  images: item.images ?? [],
  diet: item.diet ?? '',
  spice_level: item.spice_level ?? '',
  is_available: item.is_available !== false,
});

/** Stored QR ordering as form values; a venue that never set it up opens on the blank block. */
export const foodOrderingToValues = (ordering: Partial<FoodMenuOrdering> | null | undefined): FoodOrderingFormValues => ({
  enabled: ordering?.enabled === true,
  razorpay_integration_id: ordering?.razorpay_integration_id ?? '',
  razorpay_linked: ordering?.razorpay_linked === true,
  discount_pct: ordering?.discount_pct ?? blankFoodOrdering.discount_pct,
  tax_override: ordering?.tax_override === true,
  tax_mode: ordering?.tax_mode ?? blankFoodOrdering.tax_mode,
  gst_pct: ordering?.gst_pct ?? blankFoodOrdering.gst_pct,
});

/** What the menu editor opens with. The GST number is the saved one — shown locked to an owner. */
export const foodMenuToValues = (venue: FoodMenuVenue): FoodMenuFormValues => ({
  offers_food: venue.offers_food,
  food_menu: venue.food_menu.map(foodDishToValues),
  food_ordering: foodOrderingToValues(venue.food_ordering),
  gstin: venue.gstin ?? '',
});

/**
 * Ordering can be switched ON only with an account to be paid into and a dish
 * to order — the gate the server applies. It can always be switched off.
 */
export const canTakeFoodOrders = (menu: readonly Pick<FoodDishValues, 'is_available'>[], accountReady: boolean): boolean =>
  accountReady && menu.some((dish) => dish.is_available);

/** Only an approved venue's menu is edited on its own; before that the venue form owns it. */
export const isFoodMenuEditable = (venue: Pick<FoodMenuVenue, 'status'>): boolean => venue.status === 'APPROVED';

export interface VenueFoodInputOptions {
  /**
   * Whether this surface edits the Razorpay account (an owner surface with the
   * picker). Every other surface leaves the key out, which is what leaves the
   * owner's link exactly as it is.
   */
  sendAccount: boolean;
}

/** The venue's own GST goes only while it overrides; switched off, Finance's default prices its orders. */
const foodTaxInput = (ordering: FoodOrderingFormValues) =>
  ordering.tax_override
    ? { tax_override: true, tax_mode: ordering.tax_mode, gst_pct: Number(ordering.gst_pct) }
    : { tax_override: false };

const dishInput = (dish: FoodDishValues) => ({
  ...(dish.item_id ? { id: dish.item_id } : {}),
  name: dish.name.trim(),
  description: dish.description.trim(),
  category: dish.category.trim(),
  price: Number(dish.price) || 0,
  images: dish.images,
  // Blank = the catalogue had no list to pick from; the server applies its default.
  diet: dish.diet || null,
  spice_level: dish.spice_level || null,
  is_available: dish.is_available,
});

/**
 * The food fields of a save — `offers_food`, `food_menu`, `food_ordering` as
 * `VenueStep1Input` and `UpdateApprovedVenueInput` both take them. Switched
 * off, only the switch is sent: the server keeps the menu for later and turns
 * ordering off itself.
 */
export function toVenueFoodInput(values: VenueFoodFormValues, options: VenueFoodInputOptions) {
  if (!values.offers_food) return { offers_food: false };
  const ordering = values.food_ordering;
  return {
    offers_food: true,
    food_menu: values.food_menu.map(dishInput),
    food_ordering: {
      enabled: ordering.enabled,
      ...(options.sendAccount ? { razorpay_integration_id: ordering.razorpay_integration_id || null } : {}),
      discount_pct: Number(ordering.discount_pct) || 0,
      ...foodTaxInput(ordering),
    },
  };
}

/**
 * The GST number, when there is one to send. An owner gives a venue its number
 * once — so it goes only while none is saved; a console editor may change it,
 * so it goes whenever it differs from the saved one. Blank never goes: the
 * server ignores it, and sending it would read as clearing.
 */
export function foodGstinInput(typed: string, savedGstin: string, mode: FoodMenuMode): { gstin?: string } {
  const gstin = typed.trim().toUpperCase();
  const saved = savedGstin.trim().toUpperCase();
  if (!gstin || gstin === saved) return {};
  return mode === 'admin' || !saved ? { gstin } : {};
}

/**
 * The menu editor's whole `updateApprovedVenue` input. The GST number sits
 * with the food fields, so it goes only while the venue serves food.
 */
export const toFoodMenuSaveInput = (
  values: FoodMenuFormValues,
  options: VenueFoodInputOptions & { mode: FoodMenuMode; savedGstin: string },
) => ({
  ...toVenueFoodInput(values, options),
  ...(values.offers_food ? foodGstinInput(values.gstin, options.savedGstin, options.mode) : {}),
});

/** The `UpdateApprovedVenueInput` the menu editor sends. */
export type FoodMenuSaveInput = ReturnType<typeof toFoodMenuSaveInput>;

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/** What every read and the save return: the venue's food block and its invoice GST number. */
const FOOD_MENU_VENUE_FIELDS = `
  id
  venue_name
  status
  gstin
  offers_food
  food_menu {
    id
    name
    description
    category
    price
    images
    diet
    spice_level
    is_available
  }
  food_ordering {
    enabled
    razorpay_integration_id
    razorpay_linked
    discount_pct
    tax_override
    tax_mode
    gst_pct
  }
`;

/** The owner's own venue — `myVenue` answers only its owner. */
export const OWNER_FOOD_MENU_QUERY = /* GraphQL */ `
  query OwnerVenueFoodMenu($venue_id: ID!) {
    myVenue(venue_id: $venue_id) {
      ${FOOD_MENU_VENUE_FIELDS}
    }
  }
`;

/** Any venue, for a Venues console editor. */
export const ADMIN_FOOD_MENU_QUERY = /* GraphQL */ `
  query AdminVenueFoodMenu($venue_id: ID!) {
    venue(venue_doc_id: $venue_id) {
      ${FOOD_MENU_VENUE_FIELDS}
    }
  }
`;

/** The menu's catalogues and caps — never hardcoded in a client. */
export const FOOD_MENU_CONFIG_QUERY = /* GraphQL */ `
  query VenueFoodMenuConfig {
    venueRegistrationConfig {
      food_diets
      food_spice_levels
      food_menu_limit
      food_image_limit
      food_price_max
      food_discount_max_pct
    }
  }
`;

/** The save. The server takes it from the owner, and from a console editor (who may also change the GST number). */
export const UPDATE_VENUE_FOOD_MENU_MUTATION = /* GraphQL */ `
  mutation UpdateVenueFoodMenu($venue_id: ID!, $input: UpdateApprovedVenueInput!) {
    updateApprovedVenue(venue_id: $venue_id, input: $input) {
      ${FOOD_MENU_VENUE_FIELDS}
    }
  }
`;

/** One of the owner's saved Razorpay connections — the accounts a venue's food orders can be paid into. */
export interface FoodRazorpayConnection {
  id: string;
  provider: string;
  label: string;
  status: {
    connected: boolean;
    identifier?: string | null;
    live_mode?: boolean | null;
    message?: string | null;
  };
}

/** The owner's saved connections. The same root field the Partners Integrations page reads, so a new one shows up here too. */
export const FOOD_RAZORPAY_CONNECTIONS_QUERY = /* GraphQL */ `
  query FoodRazorpayConnections {
    myPartnerIntegrations {
      id
      provider
      label
      status {
        connected
        identifier
        live_mode
        message
      }
    }
  }
`;

/** Only Razorpay accounts can take a venue's food payments. */
export const razorpayConnectionsOf = (connections: readonly FoodRazorpayConnection[]): FoodRazorpayConnection[] =>
  connections.filter((connection) => connection.provider === 'RAZORPAY');
