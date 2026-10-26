import type { VenueChatEditValues } from '@duncit/forms/schemas';

export type LineEditValues = VenueChatEditValues;

export interface LineEditFormProps {
  formId: string;
  /** The line as it reads now. */
  defaultValues: LineEditValues;
  onSubmit: (values: LineEditValues) => Promise<void>;
}
