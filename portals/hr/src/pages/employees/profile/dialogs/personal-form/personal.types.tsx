import type { HrPersonalInput } from '@duncit/gql-types';
import type { HrPersonalRecord } from '@duncit/utils';

export type { PersonalValues as PersonalFormValues } from '../../../fields/employee-fields.types';

/** The API's HrPersonalInput. */
export type PersonalOutput = HrPersonalInput;

export interface PersonalFormProps {
  personal: HrPersonalRecord;
  /** Resolves true once saved. */
  onSubmit: (values: PersonalOutput) => Promise<boolean>;
  onCancel: () => void;
}
