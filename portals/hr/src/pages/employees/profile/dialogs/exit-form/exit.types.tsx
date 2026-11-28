import type { HrExitInput } from '@duncit/gql-types';
import type { HrExitType } from '@duncit/utils';

export interface ExitFormValues {
  exit_type: HrExitType;
  resignation_date: string;
  last_working_day: string;
  reason: string;
  eligible_for_rehire: boolean;
}

/** The API's HrExitInput, less the revision the page adds. */
export type ExitOutput = Omit<HrExitInput, 'expected_revision'>;

export interface ExitFormProps {
  /** `YYYY-MM-DD`; the last working day cannot be earlier. */
  dateOfJoining: string;
  /** Today plus the notice period, offered as the last working day. */
  suggestedLastDay: string;
  /** Resolves true once saved. */
  onSubmit: (values: ExitOutput) => Promise<boolean>;
  onCancel: () => void;
}
