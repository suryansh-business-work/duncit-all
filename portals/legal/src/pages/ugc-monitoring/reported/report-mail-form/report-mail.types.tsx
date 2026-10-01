import { z } from 'zod';

/** What a reviewer types when writing to the reporter or the content's owner. */
export interface ReportMailFormValues {
  subject: string;
  message: string;
}

/** The same limits the server enforces, so the form cannot accept a mail it will refuse. */
export const REPORT_MAIL_MAX = { subject: 150, message: 5000 } as const;

type Translate = (key: string) => string;

/**
 * Built per render-language rather than once at module load: the messages are
 * copy, and a schema created outside React would freeze them in whichever
 * language the bundle happened to load first.
 */
export const makeReportMailSchema = (t: Translate) =>
  z.object({
    subject: z
      .string()
      .trim()
      .min(1, t('reportLogs.mailSubjectRequired'))
      .max(REPORT_MAIL_MAX.subject, t('reportLogs.mailSubjectTooLong')),
    message: z
      .string()
      .trim()
      .min(1, t('reportLogs.mailMessageRequired'))
      .max(REPORT_MAIL_MAX.message, t('reportLogs.mailMessageTooLong')),
  });

export const EMPTY_REPORT_MAIL: ReportMailFormValues = { subject: '', message: '' };
