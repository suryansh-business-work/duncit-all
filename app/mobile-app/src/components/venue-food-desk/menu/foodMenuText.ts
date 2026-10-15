import { foodMenuToValues, type FoodMenuFormValues, type FoodMenuVenue } from '@duncit/utils';

const text = (value: number | string): string => String(value);

/**
 * The shared form values (`foodMenuToValues`) with every number as the text a
 * native input shows — a TextInput takes strings only. The shared rules and
 * mapping read either, so nothing else changes.
 */
export const foodMenuTextValues = (venue: FoodMenuVenue): FoodMenuFormValues => {
  const values = foodMenuToValues(venue);
  return {
    ...values,
    food_menu: values.food_menu.map((dish) => ({
      ...dish,
      price: text(dish.price),
      original_price: text(dish.original_price),
    })),
    food_ordering: {
      ...values.food_ordering,
      discount_pct: text(values.food_ordering.discount_pct),
      gst_pct: text(values.food_ordering.gst_pct),
    },
  };
};
