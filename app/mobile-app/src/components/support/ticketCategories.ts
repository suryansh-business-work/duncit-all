/**
 * Support-ticket categories — identical to mWeb's support form. The user picks a
 * friendly label; we map it to the server's narrower `TicketCategory` enum on
 * submit (default OTHER). Kept in one place so mWeb and native stay in lock-step.
 */
export const TICKET_CATEGORIES = [
  { value: 'BUG', label: 'Bug / Something is broken' },
  { value: 'QUESTION', label: 'Question / How do I…' },
  { value: 'FEEDBACK', label: 'Feedback / Suggestion' },
  { value: 'ACCOUNT', label: 'Account / Login' },
  { value: 'PAYMENT', label: 'Payment / Refund' },
  { value: 'OTHER', label: 'Other' },
] as const;

export const DEFAULT_TICKET_CATEGORY = 'QUESTION';

const TO_SERVER: Record<string, string> = {
  BUG: 'TECHNICAL',
  QUESTION: 'GENERAL',
  FEEDBACK: 'OTHER',
  ACCOUNT: 'GENERAL',
  PAYMENT: 'PAYMENT',
  OTHER: 'OTHER',
};

/** Map a friendly category value to the server `TicketCategory` enum. */
export function toServerCategory(value: string): string {
  return TO_SERVER[value] ?? 'OTHER';
}

/** The friendly label for a category value (falls back to the value itself). */
export function categoryLabel(value: string): string {
  return TICKET_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
