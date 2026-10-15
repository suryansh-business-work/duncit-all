/**
 * The entity for one state change on a record — approved, suspended,
 * reactivated: the record plus the moment it changed. Each transition is its
 * own message, so a person suspended twice is told twice; the caller's own
 * "nothing changed" guard is what stops a repeated press.
 *
 * A blank entity would hold the WhatsApp slot on the NUMBER forever (the log's
 * unique index is event + entity + destination), which is why every
 * account-level state change passes one of these.
 *
 * Its own module, not part of whatsapp.service: a suite that mocks the send
 * funnel wholesale must still get a real key.
 */
export const transitionEntityId = (id: string, at: Date = new Date()): string => `${id}:${at.getTime()}`;
