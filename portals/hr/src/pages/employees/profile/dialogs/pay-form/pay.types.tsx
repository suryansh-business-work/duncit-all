import type { HrCompensationInput } from '@duncit/gql-types';
import type { HrCompensationRecord, HrTemplateLine } from '@duncit/utils';

export type { PayValues as PayFormValues } from '../../../fields/employee-fields.types';

/** The API's HrCompensationInput. */
export type PayOutput = HrCompensationInput;

export interface PayFormProps {
  /** The revision in force, which a new one starts from; null when there is none yet. */
  current: HrCompensationRecord | null;
  currency: string;
  template: readonly HrTemplateLine[];
  /** Resolves true once saved. */
  onSubmit: (values: PayOutput) => Promise<boolean>;
  onCancel: () => void;
}
