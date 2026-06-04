import type { CallPromptFormValues } from './call-prompt.schema';

/** Reusable config — the languages an AI Call prompt can target (not business data). */
export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'bn-IN', label: 'Bengali' },
  { value: 'ta-IN', label: 'Tamil' },
  { value: 'te-IN', label: 'Telugu' },
  { value: 'mr-IN', label: 'Marathi' },
];

export interface CallPromptFormProps {
  defaultValues?: Partial<CallPromptFormValues>;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: CallPromptFormValues) => void;
  onCancel?: () => void;
}

export type { CallPromptFormValues };
