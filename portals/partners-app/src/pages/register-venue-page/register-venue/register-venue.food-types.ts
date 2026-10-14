/**
 * The venue form's food block, under the names the form has always used. The
 * shapes, the blank block and the caps are the shared ones every venue form
 * edits food with (@duncit/utils' `venue-food-menu`, @duncit/forms/schemas'
 * `food-menu`) — the Food Menu page, the Venues console and the native app
 * read the very same.
 */
export { blankFoodOrdering } from '@duncit/utils';
export type { FoodDishValues as FoodMenuRow, FoodOrderingFormValues as FoodOrderingValues } from '@duncit/utils';
export {
  foodMenuLimitsOf as foodLimitsOf,
  NO_FOOD_MENU_LIMITS as NO_FOOD_LIMITS,
  type FoodMenuLimits as FoodLimits,
} from '@duncit/forms/schemas';
