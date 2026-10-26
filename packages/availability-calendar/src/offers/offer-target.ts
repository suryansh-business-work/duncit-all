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

/** Whether a refused answer means the other side moved first (or the offer ran out) while the reader looked. */
export function isOfferChanged(error: unknown): boolean {
  const reason = firstGraphQLError(error)?.extensions?.reason;
  return isOfferChangedError(typeof reason === 'string' ? reason : null);
}
