import type { LiteEvent } from '../../../shared/graphql/documents';

/** What the registration card should say, from the event and the viewer's place at it. */
export type RegistrationView = 'CANCELLED_EVENT' | 'DRAFT' | 'ENDED' | 'CONFIRMED' | 'PAYMENT_PENDING' | 'PENDING_APPROVAL' | 'WAITLISTED' | 'OPEN';

const HELD = new Set(['CONFIRMED', 'PAYMENT_PENDING', 'PENDING_APPROVAL', 'WAITLISTED']);

export function registrationView(event: LiteEvent, now: Date): RegistrationView {
  if (event.status === 'CANCELLED') return 'CANCELLED_EVENT';
  if (event.status === 'DRAFT') return 'DRAFT';
  const registration = event.viewer_registration;
  if (registration && HELD.has(registration.status)) return registration.status as RegistrationView;
  if (new Date(event.end_at).getTime() < now.getTime()) return 'ENDED';
  return 'OPEN';
}

/** Seats still open across the whole event, or null when unlimited. */
export function spotsLeft(event: LiteEvent): number | null {
  if (event.capacity === null) return null;
  return Math.max(0, event.capacity - event.stats.going);
}
