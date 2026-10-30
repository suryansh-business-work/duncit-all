import { z } from 'zod';

/** The two verdicts Legal can reach about an appeal. */
export type AppealDecision = 'ACCEPT' | 'DENY';

/** What Legal types to the person when deciding. */
export interface AppealDecisionValues {
  note: string;
}

/** The server stores no longer note; the form stops at the same length. */
export const APPEAL_NOTE_MAX = 1000;

type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/**
 * Built per render-language and per verdict: a denial needs the reason (the
 * server refuses one without it), an acceptance may go without.
 */
export const makeAppealDecisionSchema = (t: Translate, decision: AppealDecision) =>
  z.object({
    note: z
      .string()
      .trim()
      .min(decision === 'DENY' ? 1 : 0, t('healthAppeals.noteRequired'))
      .max(APPEAL_NOTE_MAX, t('healthAppeals.noteTooLong', { vars: { max: APPEAL_NOTE_MAX } })),
  });

export const EMPTY_APPEAL_DECISION: AppealDecisionValues = { note: '' };
