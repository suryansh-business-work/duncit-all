import { z } from 'zod';
import type { Translate } from '../../brand-wizard/wizard-steps';

/** The longest decision note the server keeps. */
export const DECISION_NOTE_MAX = 2000;

export type ReturnDecision = 'approve' | 'reject';

export interface ReturnDecisionValues {
  note: string;
}

/** A rejection must say why (the buyer reads it); an approval note is optional. */
export const makeReturnDecisionSchema = (t: Translate, decision: ReturnDecision) => {
  const note = z.string().trim().max(DECISION_NOTE_MAX, t('partners.returns.noteTooLong'));
  return z.object({
    note: decision === 'reject' ? note.min(1, t('partners.returns.rejectNoteRequired')) : note,
  });
};
