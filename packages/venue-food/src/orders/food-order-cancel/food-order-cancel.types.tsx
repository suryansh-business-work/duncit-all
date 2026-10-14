/**
 * The cancel form's contract. The rule itself is @duncit/forms/schemas' — the
 * native sheet binds the same one — so this file only names what the form uses.
 */
export {
  FOOD_CANCEL_REASON_MAX,
  FOOD_CANCEL_REASON_MIN,
  foodOrderCancelDefaults,
  makeFoodOrderCancelSchema,
  type FoodOrderCancelValues,
} from '@duncit/forms/schemas';
