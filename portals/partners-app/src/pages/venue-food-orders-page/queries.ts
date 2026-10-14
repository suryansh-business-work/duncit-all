import type { FoodOwnerVenue } from '@duncit/utils';

/**
 * The owner's venues for the picker, with whether each serves food. The food
 * desk's documents now live with the desk itself (@duncit/venue-food, from
 * @duncit/utils' strings); the Food Menu page still reads this name.
 */
export { FOOD_OWNER_VENUES as FOOD_ORDER_VENUES } from '@duncit/venue-food';

export type FoodOrderVenue = FoodOwnerVenue;
