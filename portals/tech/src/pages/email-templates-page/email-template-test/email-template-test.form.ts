import { z } from 'zod';
import { validationRules } from '../../../forms/validation/rules';

export const emailTemplateTestSchema = z.object({
  to: validationRules.email('Recipient email'),
});

export type EmailTemplateTestValues = z.infer<typeof emailTemplateTestSchema>;

export function toSendTestInput(values: EmailTemplateTestValues) {
  return emailTemplateTestSchema.parse(values);
}
