import type { HrContactOutput, HrContactValues } from '@duncit/forms/schemas';
import type { HrPersonalRecord } from '@duncit/utils';

export type MyContactFormValues = HrContactValues;

/** The API's HrContactInput. */
export type MyContactOutput = HrContactOutput;

export interface MyContactFormProps {
  personal: HrPersonalRecord;
  /** True when the employment has ended and the record is read-only. */
  readOnly: boolean;
  /** Resolves true once saved. */
  onSubmit: (values: MyContactOutput) => Promise<boolean>;
}
