import type { Control } from 'react-hook-form';
import type { useTranslation } from '@duncit/shell';
import type { HrPayComponentType, HrSettingsRecord, HrTemplateCalc } from '@duncit/utils';
import type { HrSettingsInput } from '@duncit/gql-types';

export type Translate = ReturnType<typeof useTranslation>['t'];

/** One salary-template row as typed — the value stays text until the schema reads it. */
export interface TemplateRowValues {
  label: string;
  type: HrPayComponentType;
  calc: HrTemplateCalc;
  value: string;
  target_linked: boolean;
}

/** A list entry wrapped in an object, because useFieldArray needs one per row. */
export interface ListItemValues {
  value: string;
}

export interface HrSettingsFormValues {
  employee_code_prefix: string;
  employee_code_digits: string;
  default_currency: string;
  default_notice_period_days: string;
  default_probation_months: string;
  departments: ListItemValues[];
  work_locations: ListItemValues[];
  salary_template: TemplateRowValues[];
}

/** What a valid form becomes: the API's HrSettingsInput. */
export type HrSettingsOutput = HrSettingsInput;

export type HrSettingsControl = Control<HrSettingsFormValues, unknown, HrSettingsOutput>;

export interface HrSettingsFormProps {
  settings: HrSettingsRecord;
  /** Resolves true once saved. */
  onSubmit: (values: HrSettingsOutput) => Promise<boolean>;
}
