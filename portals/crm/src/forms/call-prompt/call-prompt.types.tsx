import type { CallPromptFormValues } from './call-prompt.schema';
import { useTranslation } from '@duncit/shell';

/** Reusable config — the languages an AI Call prompt can target (not business data). */
type Translate = ReturnType<typeof useTranslation>['t'];

export const languageOptions = (t: Translate): { value: string; label: string }[] =>[
  { value: 'auto', label: 'Auto-detect' },
  { value: 'hi-IN', label: t('crm.forms.hindi') },
  { value: 'en-IN', label: t('crm.forms.englishIndia') },
  { value: 'bn-IN', label: t('crm.forms.bengali') },
  { value: 'ta-IN', label: t('crm.forms.tamil') },
  { value: 'te-IN', label: t('crm.forms.telugu') },
  { value: 'mr-IN', label: t('crm.forms.marathi') },
];

export interface CallPromptFormProps {
  defaultValues?: Partial<CallPromptFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: CallPromptFormValues) => void;
  onCancel?: () => void;
}

export type { CallPromptFormValues };
