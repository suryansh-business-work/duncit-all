import type { FulfilmentTone } from '@duncit/utils';

import { EventRequestStatus } from '@/generated/graphql/graphql';
import type { Translate } from '@/i18n/fallback';

/** The chip each request status wears — every key written out, so the copy gate sees it. */
export function eventStatusChip(
  status: EventRequestStatus,
  t: Translate,
): { label: string; tone: FulfilmentTone } {
  switch (status) {
    case EventRequestStatus.Open:
      return { label: t('availability.eventInbox.statusOpen'), tone: 'pending' };
    case EventRequestStatus.Accepted:
      return { label: t('availability.eventInbox.statusAccepted'), tone: 'done' };
    case EventRequestStatus.Countered:
      return { label: t('availability.eventInbox.statusCountered'), tone: 'moving' };
    case EventRequestStatus.Rejected:
      return { label: t('availability.eventInbox.statusRejected'), tone: 'failed' };
    case EventRequestStatus.Fulfilled:
      return { label: t('availability.eventInbox.statusFulfilled'), tone: 'done' };
    default:
      return { label: t('availability.eventInbox.statusDismissed'), tone: 'neutral' };
  }
}

/** An answer can still change while nothing is closed (the server's own rule). */
export const isAnswerable = (status: EventRequestStatus): boolean =>
  status === EventRequestStatus.Open ||
  status === EventRequestStatus.Accepted ||
  status === EventRequestStatus.Countered;
