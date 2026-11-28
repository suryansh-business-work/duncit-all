import type { HrSettingsRecord } from '@duncit/utils';
import type { HireHrEmployeeInput } from '@duncit/gql-types';
import type { HrAccountOption } from '../../../../lib/employee-queries';
import type { BankValues, JobValues, PayValues, PersonalValues } from '../../fields/employee-fields.types';

export type { Translate } from '../../fields/employee-fields.types';

export type AccountMode = 'EXISTING' | 'NEW';

/** The account a hire starts from, when it was picked before the form opened (the unrecorded list). */
export type PresetAccount = Pick<HrAccountOption, 'id' | 'name' | 'email'>;

export interface HireFormValues {
  account_mode: AccountMode;
  account: PresetAccount | null;
  new_email: string;
  new_phone_extension: string;
  new_phone_number: string;
  employee_code: string;
  personal: PersonalValues;
  job: JobValues;
  include_pay: boolean;
  pay: PayValues;
  bank: BankValues;
}

/** What a valid form becomes — the API's input, less the per-press request id the page adds. */
export type HireOutput = Omit<HireHrEmployeeInput, 'client_request_id'>;

export const HIRE_STEPS = ['account', 'personal', 'job', 'pay', 'bank', 'review'] as const;
export type HireStep = (typeof HIRE_STEPS)[number];

export interface HireFormProps {
  settings: HrSettingsRecord;
  preset: PresetAccount | null;
  /** Resolves true once hired. */
  onSubmit: (values: HireOutput) => Promise<boolean>;
  onCancel: () => void;
}
