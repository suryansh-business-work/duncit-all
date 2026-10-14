import { parse } from 'graphql';
import {
  FOOD_MENU_CONFIG_QUERY,
  OWNER_FOOD_MENU_QUERY,
  UPDATE_VENUE_FOOD_MENU_MUTATION,
  type FoodMenuConfig,
  type FoodMenuSaveInput,
  type FoodMenuVenue,
} from '@duncit/utils';

import { graphqlRequest } from '@/services/graphql.client';

/**
 * A venue's food menu as its owner edits it — the venue's food block, the
 * menu's caps and the save. The documents are @duncit/utils' strings, the very
 * ones the Partners console, the Venues console and mWeb send through
 * @duncit/venue-food, parsed once here like services/venue-food-owner.ts.
 */
const OWNER_FOOD_MENU = parse(OWNER_FOOD_MENU_QUERY);
const FOOD_MENU_CONFIG = parse(FOOD_MENU_CONFIG_QUERY);
const UPDATE_VENUE_FOOD_MENU = parse(UPDATE_VENUE_FOOD_MENU_MUTATION);

const AUTH = { auth: true } as const;

/** The owner's own venue, or null when it is not theirs (the server answers only its owner). */
export async function fetchOwnerFoodMenu(venueId: string): Promise<FoodMenuVenue | null> {
  const data = await graphqlRequest<{ myVenue: FoodMenuVenue | null }, { venue_id: string }>(
    OWNER_FOOD_MENU,
    { venue_id: venueId },
    AUTH,
  );
  return data.myVenue;
}

export async function fetchFoodMenuConfig(): Promise<FoodMenuConfig> {
  const data = await graphqlRequest<{ venueRegistrationConfig: FoodMenuConfig }>(
    FOOD_MENU_CONFIG,
    undefined,
    AUTH,
  );
  return data.venueRegistrationConfig;
}

/** Saves the menu through `updateApprovedVenue`; the server's copy comes back. */
export async function saveFoodMenu(
  venueId: string,
  input: FoodMenuSaveInput,
): Promise<FoodMenuVenue> {
  const data = await graphqlRequest<
    { updateApprovedVenue: FoodMenuVenue },
    { venue_id: string; input: FoodMenuSaveInput }
  >(UPDATE_VENUE_FOOD_MENU, { venue_id: venueId, input }, AUTH);
  return data.updateApprovedVenue;
}
