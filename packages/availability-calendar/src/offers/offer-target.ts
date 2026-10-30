import { firstGraphQLError, isOfferChangedError } from '@duncit/utils';

/** Which side of a booking offer is answering. */
export type OfferSide = 'VENUE' | 'HOST';

/**
 * What an answer is sent against: the venue answers its booking (slot), the host
 * their pod — and either side changing its own counter names the pod.
 */
export type OfferTarget = { side: 'VENUE'; slot_id: string } | { side: OfferSide; pod_id: string };

/** The target as the mutation's own variables. */
export const targetVariables = (target: OfferTarget): Record<string, string> =>
  'slot_id' in target ? { slot_id: target.slot_id } : { pod_id: target.pod_id };

/** The round an answer carries; nothing for a request from before offers (null). */
export const roundVariables = (round: number | null): Record<string, number> => (round === null ? {} : { round });

/** Why the server refused an answer (`extensions.reason`), or null when it named no reason. */
function refusalReason(error: unknown): string | null {
  const reason = firstGraphQLError(error)?.extensions?.reason;
  return typeof reason === 'string' ? reason : null;
}

/** Whether a refused answer means the other side moved first (or the offer ran out) while the reader looked. */
export function isOfferChanged(error: unknown): boolean {
  return isOfferChangedError(refusalReason(error));
}

/** The server's reason for refusing a counter on a free booking — a free venue or a free pod is only accepted or declined. */
const FREE_NO_COUNTER_REASON = 'FREE_NO_COUNTER';

/** Whether a refused counter means the booking is free, so it cannot be countered at all. */
export const isFreeNoCounter = (error: unknown): boolean => refusalReason(error) === FREE_NO_COUNTER_REASON;
