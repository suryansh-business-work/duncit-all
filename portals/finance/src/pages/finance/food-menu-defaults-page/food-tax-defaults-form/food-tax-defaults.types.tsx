import type { FoodTaxDefaultsOutput, FoodTaxDefaultsValues } from '@duncit/forms/schemas';

export type { FoodTaxDefaultsOutput, FoodTaxDefaultsValues };

export interface FoodTaxDefaultsFormProps {
  /** What Finance has saved — the form opens on it and re-opens on it after a save. */
  values: FoodTaxDefaultsValues;
  busy: boolean;
  errorMessage?: string | null;
  onSubmit: (values: FoodTaxDefaultsOutput) => Promise<void> | void;
}
