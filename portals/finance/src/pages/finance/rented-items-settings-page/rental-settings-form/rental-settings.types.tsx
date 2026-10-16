import type { RentalSettingsOutput, RentalSettingsValues } from './rental-settings.schema';

export type { RentalSettingsOutput, RentalSettingsValues };

export interface RentalSettingsFormProps {
  /** What Finance has saved: the form opens on it and re-opens on it after a save. */
  values: RentalSettingsValues;
  busy: boolean;
  errorMessage?: string | null;
  onSubmit: (values: RentalSettingsOutput) => Promise<void> | void;
}
