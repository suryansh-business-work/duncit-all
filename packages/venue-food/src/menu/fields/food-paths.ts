import type { Control, FieldArray, FieldArrayPath, FieldValues, Path } from 'react-hook-form';
import type { FoodDishValues, FoodOrderingFormValues } from '@duncit/utils';

/**
 * The food block's field names in any venue form that mounts the shared food
 * fields — the menu editor, the Partners venue form and the Venues console
 * editor all hold it under these names (`VenueFoodFormValues`). react-hook-form
 * cannot see a fixed name through a generic form type, so the names are
 * spelled here once (the same move `FoodTaxFields` makes with its prefix).
 */

export const offersFoodPath = <T extends FieldValues>() => 'offers_food' as Path<T>;

export const menuPath = <T extends FieldValues>() => 'food_menu' as Path<T>;

export const menuArrayPath = <T extends FieldValues>() => 'food_menu' as FieldArrayPath<T>;

export const dishPath = <T extends FieldValues>(index: number, field: keyof FoodDishValues) =>
  `food_menu.${index}.${field}` as Path<T>;

export const orderingPath = <T extends FieldValues>(field: keyof FoodOrderingFormValues) =>
  `food_ordering.${field}` as Path<T>;

/** A new dish row, typed as the form's own field-array entry. */
export const asDishRow = <T extends FieldValues>(dish: FoodDishValues) =>
  dish as FieldArray<T, FieldArrayPath<T>>;

/** Every shared food field takes the host form's control; `TOut` is whatever its resolver hands back. */
export interface FoodControlProps<T extends FieldValues, TOut = T> {
  control: Control<T, unknown, TOut>;
}
