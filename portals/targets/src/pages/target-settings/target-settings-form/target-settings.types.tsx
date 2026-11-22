import type { useTranslation } from '@duncit/shell';

export type Translate = ReturnType<typeof useTranslation>['t'];

/** The two day counts stay text while typed; the schema reads them as whole numbers. */
export interface TargetSettingsFormValues {
  reminders_enabled: boolean;
  reminder_days_before_end: string;
  reminder_grace_days: string;
}

export interface TargetSettingsOutput {
  reminders_enabled: boolean;
  reminder_days_before_end: number;
  reminder_grace_days: number;
}

export interface TargetSettingsFormProps {
  initial: TargetSettingsOutput;
  /** Resolves true once saved. */
  onSubmit: (values: TargetSettingsOutput) => Promise<boolean>;
}
