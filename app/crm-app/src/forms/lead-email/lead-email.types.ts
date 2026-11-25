import { z } from 'zod';

import type { Translate } from '@/i18n/fallback';

/** How the body is written: a saved template (filled from the lead) or plain text. */
export const LEAD_EMAIL_MODES = ['template', 'text'] as const;
export type LeadEmailMode = (typeof LEAD_EMAIL_MODES)[number];

/**
 * An email to a lead contact — the portal's compose window, whose Send stays
 * off until there is an address and, for plain text, a subject and a message,
 * or a picked template. The same rules, worded, so the phone says what is missing.
 */
export const makeLeadEmailSchema = (t: Translate) =>
  z
    .object({
      provider_id: z.string(),
      to: z.string().trim().min(1, t('crmApp.compose.toRequired')),
      mode: z.enum(LEAD_EMAIL_MODES),
      subject: z.string().trim(),
      message: z.string().trim(),
      template_id: z.string(),
    })
    .superRefine((values, ctx) => {
      if (values.mode === 'template') {
        if (!values.template_id) {
          ctx.addIssue({
            code: 'custom',
            path: ['template_id'],
            message: t('crmApp.compose.templateRequired'),
          });
        }
        return;
      }
      if (!values.subject) {
        ctx.addIssue({
          code: 'custom',
          path: ['subject'],
          message: t('crmApp.compose.subjectRequired'),
        });
      }
      if (!values.message) {
        ctx.addIssue({
          code: 'custom',
          path: ['message'],
          message: t('crmApp.compose.messageRequired'),
        });
      }
    });

export type LeadEmailValues = z.infer<ReturnType<typeof makeLeadEmailSchema>>;

/** The body a template renders to, with its subject and the files it attaches. */
export interface TemplateBody {
  subject: string;
  html: string;
  ready: boolean;
  attachments: { url: string; name?: string | null }[];
}

export const emptyTemplateBody: TemplateBody = {
  subject: '',
  html: '',
  ready: false,
  attachments: [],
};

/** A fresh email to this address, in plain text, regarding the lead (the portal's default subject). */
export const leadEmailDefaults = (to: string, subject: string): LeadEmailValues => ({
  provider_id: '',
  to,
  mode: 'text',
  subject,
  message: '',
  template_id: '',
});
