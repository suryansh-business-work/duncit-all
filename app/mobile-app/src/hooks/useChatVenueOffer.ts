import { useEffect, useMemo, useRef } from 'react';
import { newestOfferLineId, venueChatOfferTitleKey, type VenueChatOfferMove } from '@duncit/utils';

import { PodMessageType } from '@/generated/graphql/graphql';
import { useOfferRevise } from '@/hooks/useOfferRevise';
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
 * The live offer beside a venue chat, both sides' answers to it and the
 * edit / withdraw of one's own unseen counter (`revise`). The offer
 * is read with the thread and again whenever a NEW offer line lands, or the
 * newest one is revised or withdrawn — someone moved, so the terms, the round
 * and whose turn it is changed — and after every answer.
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
  const revise = useOfferRevise(podId, refresh);
  const newestId = useMemo(() => newestOfferLineId(lines), [lines]);
  const moves = useMemo(() => offerMovesOf(lines), [lines]);
  // The newest offer line as it reads now: a counter edited in place keeps its
  // line but moves the round on, so the live offer is re-read for that too.
  const newestKey = useMemo(() => {
    const newest = lines.find((line) => line.id === newestId);
    return newest ? `${newest.id}:${JSON.stringify(newest.offer)}` : null;
  }, [lines, newestId]);
  // The newest offer line the live offer was last read for; undefined until the thread is in.
  const readFor = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;
    const known = readFor.current !== undefined;
    const moved = readFor.current !== newestKey;
    readFor.current = newestKey;
    if (known && moved) fireAndForget(refresh());
  }, [ready, newestKey, refresh]);

  return { live: offer, newestId, moves, host, venue, revise };
}
