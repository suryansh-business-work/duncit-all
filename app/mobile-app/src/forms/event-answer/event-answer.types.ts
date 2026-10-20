import { z } from 'zod';
import { EVENT_REQUEST_NOTE_MAX, makeEventRequestSchema } from '@duncit/forms/schemas';

import type { Translate } from '@/i18n/fallback';

/**
 * The owner's answer to a workshop/event request. Accept and Reject carry an
 * optional note — the same 280-character rule the member's own request
 * follows (`makeEventRequestSchema`, one rule for both sides). A counter
 * offer adds the window and the guests; the server prices it.
 */
export const makeAnswerNoteSchema = (t: Translate) => makeEventRequestSchema(t);
export type AnswerNoteValues = z.infer<ReturnType<typeof makeAnswerNoteSchema>>;

export interface CounterOfferValues {
  start: Date | null;
  end: Date | null;
  guests: string;
  note: string;
}

export function makeCounterOfferSchema(t: Translate) {
  return z
    .object({
      start: z.date().nullable(),
      end: z.date().nullable(),
      guests: z.string(),
      note: z
        .string()
        .trim()
        .max(
          EVENT_REQUEST_NOTE_MAX,
          t('publicPage.eventRequest.noteTooLong', { vars: { max: EVENT_REQUEST_NOTE_MAX } }),
        ),
    })
    .superRefine((values, ctx) => {
      const fail = (path: string, message: string) =>
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
      if (!values.start) fail('start', t('availability.eventInbox.validation.startRequired'));
      if (!values.end) fail('end', t('availability.eventInbox.validation.endRequired'));
      else if (values.start && values.end <= values.start) {
        fail('end', t('availability.eventInbox.validation.endAfterStart'));
      }
      const guests = values.guests.trim();
      if (guests !== '' && !(Number.isInteger(Number(guests)) && Number(guests) >= 0)) {
        fail('guests', t('availability.eventInbox.validation.guests'));
      }
    });
}

export const counterOfferDefaults: CounterOfferValues = {
  start: null,
  end: null,
  guests: '',
  note: '',
};
