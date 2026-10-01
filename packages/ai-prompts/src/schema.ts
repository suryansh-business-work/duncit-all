import { z } from 'zod';
import type { PromptTranslate } from './copy';
import type { PromptVariable } from './types';
import { missingRequiredVariables } from './render';

/**
 * Validation for a Prompt Library entry (RHF + Zod, rule 30).
 *
 * A code prompt and an AI prompt are validated by the same schema with one
 * difference that matters: a code prompt must keep the placeholders its call
 * site fills in. That is a rule about THIS prompt, not about prompts, so it is
 * a factory rather than a constant — the variables come from the row.
 *
 * The messages are read through the console's translator (rule 38), so the
 * sentence that stops an author follows Admin > Localization like every label
 * around it.
 */
export const promptFormSchema = (t: PromptTranslate, variables: readonly PromptVariable[] = []) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, t('ai.library.validation.nameMin'))
      .max(80, t('ai.library.validation.nameMax')),
    key: z
      .string()
      .trim()
      .max(80, t('ai.library.validation.keyMax'))
      .regex(/^[a-z0-9.-]*$/, t('ai.library.validation.keyPattern'))
      .default(''),
    description: z.string().trim().max(200, t('ai.library.validation.descriptionMax')).default(''),
    category: z.string().trim().max(40, t('ai.library.validation.categoryMax')).default(''),
    target_model: z.string().trim().max(60, t('ai.library.validation.modelMax')).default(''),
    content: z
      .string()
      .trim()
      .min(10, t('ai.library.validation.contentMin'))
      .max(20000, t('ai.library.validation.contentMax'))
      .superRefine((content, ctx) => {
        const missing = missingRequiredVariables(content, variables);
        if (missing.length === 0) return;
        const named = missing.map((name) => `{{${name}}}`).join(', ');
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('ai.library.validation.missingVariables', { vars: { named } }),
        });
      }),
    is_active: z.boolean().default(true),
  });

export type PromptFormValues = z.infer<ReturnType<typeof promptFormSchema>>;

export const promptInitialValues: PromptFormValues = {
  name: '',
  key: '',
  description: '',
  category: 'General',
  target_model: '',
  content: '',
  is_active: true,
};
