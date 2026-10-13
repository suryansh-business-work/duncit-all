import { gql } from '@apollo/client';
import {
  PLACE_VENUE_FOOD_ORDER_MUTATION,
  VENUE_FOOD_ORDER_QUERY,
  VERIFY_VENUE_FOOD_ORDER_MUTATION,
  type VenueFoodOrder,
  type VenueFoodOrderPlacement,
} from '@duncit/utils';

// The documents live in @duncit/utils so the native app sends the same ones.
export const PLACE_VENUE_FOOD_ORDER = gql(PLACE_VENUE_FOOD_ORDER_MUTATION);
export const VERIFY_VENUE_FOOD_ORDER = gql(VERIFY_VENUE_FOOD_ORDER_MUTATION);
export const VENUE_FOOD_ORDER = gql(VENUE_FOOD_ORDER_QUERY);

export interface PlaceVenueFoodOrderData {
  placeVenueFoodOrder: VenueFoodOrderPlacement;
}

export interface VenueFoodOrderData {
  venueFoodOrder: VenueFoodOrder | null;
}
