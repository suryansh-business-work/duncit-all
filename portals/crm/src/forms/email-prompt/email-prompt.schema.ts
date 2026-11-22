import { z } from 'zod';
import type { Translate } from './email-prompt.types';

/** Long enough for a detailed brief; short enough that it cannot crowd out the email in the model's context. */
export const EMAIL_PROMPT_MAX = 8000;

/** Every `{{ name }}` in a body (spaces inside the braces allowed, as the server allows). */
export function placeholdersIn(value: string): Set<string> {
  const names = new Set<string>();
  for (const part of value.split('{{').slice(1)) {
    const end = part.indexOf('}}');
    if (end !== -1) names.add(part.slice(0, end).trim());
  }
  return names;
}

/**
 * A prompt body. Each `{{placeholder}}` the CRM fills in must stay in the text
 * (the server refuses a body that drops a required one, too) — otherwise the AI
 * would never see the instruction, the brand images or the template.
 */
export const emailPromptSchema = (t: Translate, required: readonly string[]) =>
  z.object({
    content: z
      .string()
      .trim()
      .min(1, t('crm.emailSettings.promptRequired'))
      .max(EMAIL_PROMPT_MAX, t('crm.emailSettings.promptTooLong', { vars: { max: EMAIL_PROMPT_MAX } }))
      .superRefine((value, ctx) => {
        const present = placeholdersIn(value);
        const missing = required.filter((name) => !present.has(name));
        if (missing.length) {
          ctx.addIssue({
            code: 'custom',
            message: t('crm.emailSettings.promptMissingVariables', { vars: { names: missing.map((n) => `{{${n}}}`).join(', ') } }),
          });
        }
      }),
  });

export type EmailPromptFormValues = z.infer<ReturnType<typeof emailPromptSchema>>;
