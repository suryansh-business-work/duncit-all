import type { FoodCheckoutValues } from '@duncit/forms/schemas';

// The schema, its values and its defaults are shared with the native app, so
// they live in @duncit/forms/schemas; this file keeps only the form's props.
export { foodCheckoutDefaults, makeFoodCheckoutSchema, type FoodCheckoutValues } from '@duncit/forms/schemas';

export interface FoodCheckoutFormProps {
  /** The sheet's Pay button lives outside the form and targets it by id. */
  formId: string;
  /** Who is ordering, as far as it is already known — the account, or the last order from this device. */
  initial: FoodCheckoutValues;
  /** A payment is in flight: the fields lock with the button. */
  disabled: boolean;
  onSubmit: (values: FoodCheckoutValues) => void | Promise<void>;
}
