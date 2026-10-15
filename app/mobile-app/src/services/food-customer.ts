import { parse } from 'graphql';
import {
  MY_VENUE_FOOD_ORDERS_QUERY,
  VENUE_FOOD_RATING_QUERY,
  type MyVenueFoodOrdersInput,
  type MyVenueFoodOrdersPage,
  type VenueFoodRating,
} from '@duncit/utils';

import { graphqlRequest } from '@/services/graphql.client';

/**
 * The guest-side reads around the menu: "Your Food Orders" and the venue's
 * food rating. The documents come from @duncit/utils as strings — the same
 * ones mWeb sends — and are parsed once here, as services/food-order does. The
 * calls carry the session, so the member's own orders come back with the ones
 * this device placed.
 */
const MY_VENUE_FOOD_ORDERS = parse(MY_VENUE_FOOD_ORDERS_QUERY);
const VENUE_FOOD_RATING = parse(VENUE_FOOD_RATING_QUERY);

export async function fetchMyFoodOrders(
  input: MyVenueFoodOrdersInput,
): Promise<MyVenueFoodOrdersPage> {
  const data = await graphqlRequest<
    { myVenueFoodOrders: MyVenueFoodOrdersPage },
    { input: MyVenueFoodOrdersInput }
  >(MY_VENUE_FOOD_ORDERS, { input }, { auth: true });
  return data.myVenueFoodOrders;
}

export async function fetchVenueFoodRating(venueId: string): Promise<VenueFoodRating> {
  const data = await graphqlRequest<{ venueFoodRating: VenueFoodRating }, { venueId: string }>(
    VENUE_FOOD_RATING,
    { venueId },
  );
  return data.venueFoodRating;
}
