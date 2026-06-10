import { z } from 'zod';

/**
 * Validation for a Static Content prompt (AI Call Prompts). RHF + Zod per the
 * project form standard. `context` is the body the AI agent speaks in.
 */
export const callPromptSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Keep the name under 80 characters'),
  description: z.string().trim().max(200, 'Keep the description under 200 characters').optional().default(''),
  language: z.string().min(1, 'Select a language'),
  context: z
    .string()
    .trim()
    .min(10, 'Add at least 10 characters of context')
    .max(5000, 'Context is too long (max 5000 characters)'),
  is_active: z.boolean(),
});

export type CallPromptFormValues = z.infer<typeof callPromptSchema>;

export const callPromptDefaults: CallPromptFormValues = {
  name: '',
  description: '',
  language: 'auto',
  context: '',
  is_active: true,
};
