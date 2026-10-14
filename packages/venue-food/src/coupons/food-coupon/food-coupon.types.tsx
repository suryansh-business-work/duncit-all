/**
 * The coupon form's contract. The rules and both mappers are
 * @duncit/forms/schemas' — the native form binds the same ones — so this file
 * only names what the form uses.
 */
export {
  FOOD_COUPON_DESCRIPTION_MAX,
  foodCouponToValues,
  makeFoodCouponSchema,
  toFoodCouponInput,
  type FoodCouponFormValues,
  type FoodCouponInput,
} from '@duncit/forms/schemas';
