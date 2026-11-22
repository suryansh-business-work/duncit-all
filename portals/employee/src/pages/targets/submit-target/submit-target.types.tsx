import type { Control } from 'react-hook-form';
import type { useTranslation } from '@duncit/app-settings';
import type { EmployeeTargetRecord } from '@duncit/utils';

export type Translate = ReturnType<typeof useTranslation>['t'];

export interface AchievementValues {
  title: string;
  details: string;
}

export interface SubmitTargetFormValues {
  /** Whole percent, 0 to 100. NaN while the box is empty. */
  completion_percent: number;
  achievements: AchievementValues[];
  updates: string;
}

export type SubmitTargetControl = Control<SubmitTargetFormValues>;

export interface SubmitTargetFormProps {
  /** The month being reported on; its earlier report, if any, seeds the form. */
  target: EmployeeTargetRecord;
  /** Resolves true once saved. */
  onSubmit: (values: SubmitTargetFormValues) => Promise<boolean>;
}
