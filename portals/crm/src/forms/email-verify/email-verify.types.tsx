import type { useTranslation } from '@duncit/shell';
import type { EmailVerifyFormValues } from './email-verify.schema';

export type Translate = ReturnType<typeof useTranslation>['t'];

export interface EmailVerifyFormProps {
  submitting?: boolean;
  onSubmit: (values: EmailVerifyFormValues) => void;
}

export type { EmailVerifyFormValues };
