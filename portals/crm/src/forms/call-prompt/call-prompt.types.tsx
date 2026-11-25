import { CALL_PROMPT_LANGUAGES } from '@duncit/forms/schemas';
import type { CallPromptFormValues } from './call-prompt.schema';
import { useTranslation } from '@duncit/shell';

/** Reusable config — the languages an AI Call prompt can target (not business data). */
type Translate = ReturnType<typeof useTranslation>['t'];

export const languageOptions = (t: Translate): { value: string; label: string }[] =>
  CALL_PROMPT_LANGUAGES.map((language) => ({ value: language.value, label: t(language.labelKey) }));

export interface CallPromptFormProps {
  defaultValues?: Partial<CallPromptFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: CallPromptFormValues) => void;
  onCancel?: () => void;
}

export type { CallPromptFormValues };
