import { z } from 'zod';

/**
 * The longest note the server keeps with a decision (it trims, then caps at 300).
 * Checking it here only saves a round trip; the server checks it again.
 */
export const NOTE_MAX_LENGTH = 300;

/** The validation copy, passed in translated — the schema renders no English. */
export interface DecisionMessages {
  noteTooLong: string;
}

export const decisionSchema = (messages: DecisionMessages) =>
  z.object({ note: z.string().trim().max(NOTE_MAX_LENGTH, messages.noteTooLong) });

export type DecisionForm = z.infer<ReturnType<typeof decisionSchema>>;

export const blankDecision: DecisionForm = { note: '' };

/** What the mutation takes. A blank note is sent as no note rather than an empty one. */
export const toDecisionInput = (id: string, approve: boolean, form: DecisionForm) => ({
  id,
  approve,
  note: form.note || null,
});
