import { z } from 'zod';
import type { Translate } from '@duncit/forms/schemas';
import type { LiteEmailTemplate, LiteEmailTemplateInput } from '../../../graphql/email';

export type EmailTemplateValues = LiteEmailTemplateInput;

const SUBJECT_MAX = 200;
const BODY_MAX = 5000;

export const templateValuesFrom = (template: LiteEmailTemplate): EmailTemplateValues => ({
  subject: template.subject,
  body: template.body,
  enabled: template.enabled,
});

/** Wraps a placeholder name the way the body expects it. */
export const braced = (name: string): string => `{${name}}`;

export const makeEmailTemplateSchema = (t: Translate) => {
  const subject = t('litePortal.emailTemplates.subject');
  const body = t('litePortal.emailTemplates.body');
  return z.object({
    subject: z
      .string()
      .trim()
      .min(1, t('litePortal.validation.required', { vars: { field: subject } }))
      .max(SUBJECT_MAX, t('litePortal.validation.max', { vars: { field: subject, max: SUBJECT_MAX } })),
    body: z
      .string()
      .trim()
      .min(1, t('litePortal.validation.required', { vars: { field: body } }))
      .max(BODY_MAX, t('litePortal.validation.max', { vars: { field: body, max: BODY_MAX } })),
    enabled: z.boolean(),
  });
};
