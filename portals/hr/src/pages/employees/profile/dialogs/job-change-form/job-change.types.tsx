import type { HrJobChangeInput } from '@duncit/gql-types';
import type { HrJobChangeReason, HrJobRecord, HrSettingsRecord } from '@duncit/utils';
import type { JobValues } from '../../../fields/employee-fields.types';

export interface JobChangeFormValues {
  job: JobValues;
  reason: HrJobChangeReason;
  effective_date: string;
  note: string;
}

/** The API's HrJobChangeInput, less the revision the page adds. */
export type JobChangeOutput = Omit<HrJobChangeInput, 'expected_revision'>;

export interface JobChangeFormProps {
  employeeId: string;
  job: HrJobRecord;
  settings: HrSettingsRecord | null;
  /** Resolves true once saved. */
  onSubmit: (values: JobChangeOutput) => Promise<boolean>;
  onCancel: () => void;
}
