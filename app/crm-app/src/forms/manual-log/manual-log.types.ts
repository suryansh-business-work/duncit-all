import { z } from 'zod';

import type { Translate } from '@/i18n/fallback';
import { manualLogHtml } from '@/screens/lead/tabs/ManualLogsHtml';

/** The server's caps: a title is cut at 200 characters, a body over 100,000 (as HTML) is refused. */
export const MANUAL_LOG_TITLE_MAX = 200;
export const MANUAL_LOG_BODY_MAX = 100_000;

/**
 * A manual log on a lead — the portal's composer: an optional title, the log
 * itself (required), and the teammates it @mentions. The rules are the
 * server's, said before saving instead of after.
 */
export const makeManualLogSchema = (t: Translate) =>
  z
    .object({
      summary: z
        .string()
        .trim()
        .max(
          MANUAL_LOG_TITLE_MAX,
          t('crmApp.note.tooLong', { vars: { max: MANUAL_LOG_TITLE_MAX } }),
        ),
      body: z.string().trim().min(1, t('crmApp.manualLogs.bodyRequired')),
      mentions: z.array(z.object({ id: z.string(), label: z.string() })),
    })
    .superRefine((values, ctx) => {
      if (manualLogHtml(values.body, values.mentions).length > MANUAL_LOG_BODY_MAX) {
        ctx.addIssue({ code: 'custom', path: ['body'], message: t('crmApp.manualLogs.tooLong') });
      }
    });

export type ManualLogValues = z.infer<ReturnType<typeof makeManualLogSchema>>;

export const manualLogDefaults: ManualLogValues = { summary: '', body: '', mentions: [] };
