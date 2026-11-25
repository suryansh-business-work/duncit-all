import { z } from 'zod';
import { EMAIL } from '@duncit/regex';
import { crmEmailTemplateSlug } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * CRM › Email Templates: a new template, a test send and an AI request — the
 * rules the CRM portal's dialogs and the Duncit CRM app's screens both check.
 */

export const EMAIL_TEMPLATE_TARGETS = ['VENUE', 'HOST', 'ECOMM', 'STATIC'] as const;
export type EmailTemplateTarget = (typeof EMAIL_TEMPLATE_TARGETS)[number];

/** A new template: who it is for, its name, an optional slug (derived from the name when blank) and its subject. */
export const makeEmailTemplateCreateSchema = (t: Translate) => {
  const message = t('crm.emailTemplates.pickATypeAndFillName');
  return z
    .object({
      target: z.enum(EMAIL_TEMPLATE_TARGETS, { error: message }),
      name: z.string().trim().min(1, message),
      slug: z.string().trim(),
      subject: z.string().trim().min(1, message),
    })
    .superRefine((values, ctx) => {
      if (!values.slug && !crmEmailTemplateSlug(values.name)) {
        ctx.addIssue({ code: 'custom', path: ['slug'], message });
      }
    });
};

/** The form's values: no audience is picked until one is chosen. */
export interface EmailTemplateCreateValues {
  target: EmailTemplateTarget | '';
  name: string;
  slug: string;
  subject: string;
}

export const emailTemplateCreateDefaults: EmailTemplateCreateValues = { target: '', name: '', slug: '', subject: '' };

/** The create mutation's input: the typed slug, else the one derived from the name; name and subject trimmed. */
export const toEmailTemplateCreateInput = (values: EmailTemplateCreateValues, mjml: string) => ({
  slug: values.slug.trim() || crmEmailTemplateSlug(values.name),
  name: values.name.trim(),
  subject: values.subject.trim(),
  target: values.target || null,
  mjml,
});

/** A test send: one address, the shared EMAIL pattern. */
export const makeEmailTestSendSchema = (t: Translate) =>
  z.object({
    to: z.string().trim().regex(EMAIL, t('crm.emailTemplates.enterValidEmail')),
  });

export type EmailTestSendValues = z.infer<ReturnType<typeof makeEmailTestSendSchema>>;

export const emailTestSendDefaults: EmailTestSendValues = { to: '' };

/** What the AI writer is asked to write or change; never blank. */
export const makeEmailAiRequestSchema = (t: Translate) =>
  z.object({
    prompt: z.string().trim().min(1, t('crm.emailSettings.promptRequired')),
  });

export type EmailAiRequestValues = z.infer<ReturnType<typeof makeEmailAiRequestSchema>>;

export const emailAiRequestDefaults: EmailAiRequestValues = { prompt: '' };
