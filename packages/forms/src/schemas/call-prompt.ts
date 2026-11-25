import { z } from 'zod';

import type { Translate } from './translate';

/**
 * A Static Content prompt (CRM › AI Call Prompts) — the context block the AI
 * agent speaks in during an AI Call. Shared by the CRM portal and the Duncit
 * CRM app, so both refuse the same prompt with the same sentence.
 */
export const CALL_PROMPT_LIMITS = { nameMin: 2, nameMax: 80, descriptionMax: 200, contextMin: 10, contextMax: 5000 } as const;

/** The languages a prompt can target (configuration, not business data), with their label keys. */
export const CALL_PROMPT_LANGUAGES: ReadonlyArray<{ value: string; labelKey: string }> = [
  { value: 'auto', labelKey: 'crm.callPrompts.autoDetect' },
  { value: 'hi-IN', labelKey: 'crm.forms.hindi' },
  { value: 'en-IN', labelKey: 'crm.forms.englishIndia' },
  { value: 'bn-IN', labelKey: 'crm.forms.bengali' },
  { value: 'ta-IN', labelKey: 'crm.forms.tamil' },
  { value: 'te-IN', labelKey: 'crm.forms.telugu' },
  { value: 'mr-IN', labelKey: 'crm.forms.marathi' },
];

export const makeCallPromptSchema = (t: Translate) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(CALL_PROMPT_LIMITS.nameMin, t('crm.callPrompts.nameMin'))
      .max(CALL_PROMPT_LIMITS.nameMax, t('crm.callPrompts.nameMax')),
    description: z.string().trim().max(CALL_PROMPT_LIMITS.descriptionMax, t('crm.callPrompts.descriptionMax')),
    language: z.string().min(1, t('crm.callPrompts.languageRequired')),
    context: z
      .string()
      .trim()
      .min(CALL_PROMPT_LIMITS.contextMin, t('crm.callPrompts.contextMin'))
      .max(CALL_PROMPT_LIMITS.contextMax, t('crm.callPrompts.contextMax')),
    is_active: z.boolean(),
  });

export type CallPromptValues = z.infer<ReturnType<typeof makeCallPromptSchema>>;

export const callPromptDefaults: CallPromptValues = {
  name: '',
  description: '',
  language: 'auto',
  context: '',
  is_active: true,
};
