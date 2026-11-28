import type { HrRehireInput } from '@duncit/gql-types';
import type { HrJobRecord, HrSettingsRecord } from '@duncit/utils';
import type { JobValues } from '../../../fields/employee-fields.types';

export interface RehireFormValues {
  job: JobValues;
  note: string;
}

/** The API's HrRehireInput, less the revision the page adds. */
export type RehireOutput = Omit<HrRehireInput, 'expected_revision'>;

export interface RehireFormProps {
  employeeId: string;
  /** The job they left, which the new one starts from. */
  job: HrJobRecord;
  /** `YYYY-MM-DD`; the new joining date must come after it. */
  lastWorkingDay: string | null;
  settings: HrSettingsRecord | null;
  /** Resolves true once saved. */
  onSubmit: (values: RehireOutput) => Promise<boolean>;
  onCancel: () => void;
}
