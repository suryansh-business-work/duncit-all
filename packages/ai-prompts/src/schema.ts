import { z } from 'zod';
import type { PromptVariable } from './types';
import { missingRequiredVariables } from './render';

/**
 * Validation for a Prompt Library entry (RHF + Zod, rule 30).
 *
 * A code prompt and an AI prompt are validated by the same schema with one
 * difference that matters: a code prompt must keep the placeholders its call
 * site fills in. That is a rule about THIS prompt, not about prompts, so it is
 * a factory rather than a constant — the variables come from the row.
 */
export const promptFormSchema = (variables: readonly PromptVariable[] = []) =>
  z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Keep the name under 80 characters'),
    key: z
      .string()
      .trim()
      .max(80, 'Keep the key under 80 characters')
      .regex(
        /^[a-z0-9.-]*$/,
        'Use lowercase letters, numbers, dots and dashes — it goes in a URL',
      )
      .default(''),
    description: z.string().trim().max(200, 'Keep the description under 200 characters').default(''),
    category: z.string().trim().max(40, 'Keep the category under 40 characters').default(''),
    target_model: z.string().trim().max(60, 'Keep the model under 60 characters').default(''),
    content: z
      .string()
      .trim()
      .min(10, 'Add at least 10 characters of prompt content')
      .max(20000, 'Prompt is too long (max 20000 characters)')
      .superRefine((content, ctx) => {
        const missing = missingRequiredVariables(content, variables);
        if (missing.length === 0) return;
        const named = missing.map((name) => `{{${name}}}`).join(', ');
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Keep ${named} in the body — the feature fills them in, and without them it runs with the facts missing.`,
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
