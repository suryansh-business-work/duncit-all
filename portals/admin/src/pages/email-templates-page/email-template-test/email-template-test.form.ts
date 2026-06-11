import * as yup from 'yup';
import { validationRules } from '../../../forms/validation/rules';

export const emailTemplateTestSchema = yup.object({
  to: validationRules.email('Recipient email'),
});

export type EmailTemplateTestValues = yup.InferType<typeof emailTemplateTestSchema>;

export function toSendTestInput(values: EmailTemplateTestValues) {
  return emailTemplateTestSchema.cast(values, { stripUnknown: true });
}
