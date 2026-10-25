import { useEffect, useMemo, useRef } from 'react';
import { newestOfferLineId, venueChatOfferTitleKey, type VenueChatOfferMove } from '@duncit/utils';

import { PodMessageType } from '@/generated/graphql/graphql';
import { usePodVenueOffer } from '@/hooks/usePodVenueOffer';
import type { VenueChatMessage } from '@/hooks/useVenueChat';
import { useVenueOfferAnswers } from '@/hooks/useVenueOfferAnswers';
import { fireAndForget } from '@/utils/fire-and-forget';

/** Each OFFER line this build can draw as a card, by line id — a move it knows a heading for. */
function offerMovesOf(lines: readonly VenueChatMessage[]): Map<string, VenueChatOfferMove> {
  const moves = new Map<string, VenueChatOfferMove>();
  for (const line of lines) {
    if (line.type !== PodMessageType.Offer || !line.offer) continue;
    if (venueChatOfferTitleKey(line.offer, 'HOST')) moves.set(line.id, line.offer);
  }
  return moves;
}

/**
 * The live offer beside a venue chat and both sides' answers to it. The offer
 * is read with the thread and again whenever a NEW offer line lands — someone
 * moved, so the terms and whose turn it is changed — and after every answer.
 * Only the thread's newest offer line may still be answered. `ready` is false
 * until the first page is in: the lines it loads with are what the first read
 * already saw. mWeb twin: useChatVenueOffer.
 */
export function useChatVenueOffer(
  podId: string,
  lines: readonly VenueChatMessage[],
  ready: boolean,
) {
  const { offer, refresh, host } = usePodVenueOffer(podId);
  const venue = useVenueOfferAnswers(refresh);
  const newestId = useMemo(() => newestOfferLineId(lines), [lines]);
  const moves = useMemo(() => offerMovesOf(lines), [lines]);
  // The newest offer line the live offer was last read for; undefined until the thread is in.
  const readFor = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;
    const known = readFor.current !== undefined;
    const moved = readFor.current !== newestId;
    readFor.current = newestId;
    if (known && moved) fireAndForget(refresh());
  }, [ready, newestId, refresh]);

  return { live: offer, newestId, moves, host, venue };
}
