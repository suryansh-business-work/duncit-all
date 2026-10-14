import type { VenueFoodTaxValues } from '@duncit/forms/schemas';

/** One dish on the venue's food menu. `item_id` is the server's id for a dish
 * already listed ('' = new) — sent back so a saved dish keeps its identity.
 * (Not `id`: useFieldArray keeps that name for its own row key.) */
export interface FoodMenuRow {
  item_id: string;
  name: string;
  description: string;
  /** The menu section heading the dish sits under — free text. */
  category: string;
  price: number | string;
  images: string[];
  diet: string;
  spice_level: string;
  is_available: boolean;
}

/** Scan-and-order: guests pay the venue's own saved Razorpay connection.
 * The GST fields are the venue's own override of Finance's default; while it
 * is off they hold what the server resolved, so switching it on starts there. */
export interface FoodOrderingValues extends VenueFoodTaxValues {
  enabled: boolean;
  razorpay_integration_id: string;
  discount_pct: number | string;
}

/** The food caps of the registration config — what the schema checks against. */
export interface FoodLimits {
  food_menu_limit: number;
  food_image_limit: number;
  food_price_max: number;
  food_discount_max_pct: number;
}

/** No client-side cap: stands in until the config has answered, so the server's
 * own limits decide rather than a number guessed here. */
export const NO_FOOD_LIMITS: FoodLimits = {
  food_menu_limit: Number.MAX_SAFE_INTEGER,
  food_image_limit: Number.MAX_SAFE_INTEGER,
  food_price_max: Number.MAX_SAFE_INTEGER,
  food_discount_max_pct: Number.MAX_SAFE_INTEGER,
};

export const foodLimitsOf = (config: FoodLimits): FoodLimits => ({
  food_menu_limit: config.food_menu_limit,
  food_image_limit: config.food_image_limit,
  food_price_max: config.food_price_max,
  food_discount_max_pct: config.food_discount_max_pct,
});

export const blankFoodOrdering: FoodOrderingValues = {
  enabled: false,
  razorpay_integration_id: '',
  discount_pct: 0,
  tax_override: false,
  tax_mode: '',
  gst_pct: '',
};
