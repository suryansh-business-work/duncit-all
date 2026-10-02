import type { PodRefundStatus } from '@duncit/utils';
import { fallbackT, type Translate } from '../../../i18n/fallback';
import type { PodHistoryItem } from '../queries';

/** Translation keys for each refund state — the words live in @duncit/i18n so
 * mWeb and the native app cannot describe the same refund differently. */
const REFUND_KEY: Record<PodRefundStatus, string> = {
  NONE: 'mweb.podHistory.refundNotStarted',
  PENDING: 'mweb.podHistory.refundPending',
  PROCESSED: 'mweb.podHistory.refundProcessed',
  NOT_ELIGIBLE: 'mweb.podHistory.refundNotEligible',
};

export const refundLabel = (status: PodRefundStatus, t: Translate = fallbackT) =>
  t(REFUND_KEY[status] ?? REFUND_KEY.NONE);

export const makeSupportPath = (item: PodHistoryItem, refundStatus: PodRefundStatus, t: Translate) => {
  const title = item.pod?.pod_title ?? t('mweb.podHistory.pod');
  const params = new URLSearchParams({
    category: 'PAYMENT',
    subject: `Support - ${title}`,
    message: `I need help with my pod booking. Pod: ${title}. Membership: ${item.id}. Refund status: ${refundLabel(refundStatus, t)}.`,
  });
  if (item.pod?.id) {
    params.set('podId', item.pod.id);
    params.set('podTitle', title);
  }
  return `/support/tickets?${params.toString()}`;
};
