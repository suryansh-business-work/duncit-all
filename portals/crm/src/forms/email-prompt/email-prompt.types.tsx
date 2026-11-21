import type { useTranslation } from '@duncit/shell';
import type { CrmEmailAiPrompt } from '../../api/emailSettings.gql';
import type { EmailPromptFormValues } from './email-prompt.schema';

export type Translate = ReturnType<typeof useTranslation>['t'];

export interface EmailPromptFormProps {
  prompt: CrmEmailAiPrompt;
  submitting?: boolean;
  resetting?: boolean;
  onSubmit: (values: EmailPromptFormValues) => void;
  /** Ask to put the shipped default back (the parent confirms first). */
  onReset: () => void;
}

export type { EmailPromptFormValues };
