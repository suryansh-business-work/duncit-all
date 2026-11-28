import type { HrBankInput } from '@duncit/gql-types';
import type { HrBankSummary } from '@duncit/utils';

export type { BankValues as BankFormValues } from '../../../fields/employee-fields.types';

/** The API's HrBankInput; an account number or PAN left out keeps the stored one. */
export type BankOutput = HrBankInput;

export interface BankFormProps {
  bank: HrBankSummary;
  /** Resolves true once saved. */
  onSubmit: (values: BankOutput) => Promise<boolean>;
  onCancel: () => void;
}
