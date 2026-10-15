import { z } from 'zod';

import type { Translate } from './translate';

/** The server's bound on the note (eventRequest.model `EVENT_REQUEST_NOTE_MAX`). */
export const EVENT_REQUEST_NOTE_MAX = 280;

/**
 * "Request an event" from a host or venue with nothing upcoming: the one thing
 * the member may add is an optional note. One rule for the mWeb dialog and the
 * native sheet (rules 27 + 56).
 */
export function makeEventRequestSchema(t: Translate) {
  return z.object({
    note: z
      .string()
      .trim()
      .max(EVENT_REQUEST_NOTE_MAX, t('publicPage.eventRequest.noteTooLong', { vars: { max: EVENT_REQUEST_NOTE_MAX } })),
  });
}

export type EventRequestValues = z.infer<ReturnType<typeof makeEventRequestSchema>>;

export const eventRequestDefaults: EventRequestValues = { note: '' };
