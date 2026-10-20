import type { Translate } from '../pricing/types';
import type { EventRequestStatus } from './queries';

/**
 * Every status's label and colour — literal keys, so the translation gate sees
 * each one. The shell's request table reads the same keys.
 */
export function eventRequestStatusLabel(t: Translate, status: EventRequestStatus): string {
  const labels: Record<EventRequestStatus, string> = {
    OPEN: t('publicPage.eventRequests.statusOpen'),
    ACCEPTED: t('publicPage.eventRequests.statusAccepted'),
    COUNTERED: t('publicPage.eventRequests.statusCountered'),
    REJECTED: t('publicPage.eventRequests.statusRejected'),
    FULFILLED: t('publicPage.eventRequests.statusFulfilled'),
    DISMISSED: t('publicPage.eventRequests.statusDismissed'),
  };
  return labels[status];
}

export const EVENT_REQUEST_STATUS_COLOR: Readonly<
  Record<EventRequestStatus, 'warning' | 'success' | 'info' | 'error' | 'default'>
> = {
  OPEN: 'warning',
  ACCEPTED: 'success',
  COUNTERED: 'info',
  REJECTED: 'error',
  FULFILLED: 'success',
  DISMISSED: 'default',
};

/** An answer can still change while nothing is closed: open, or answered with an offer. */
export const isAnswerable = (status: EventRequestStatus): boolean =>
  status === 'OPEN' || status === 'ACCEPTED' || status === 'COUNTERED';
