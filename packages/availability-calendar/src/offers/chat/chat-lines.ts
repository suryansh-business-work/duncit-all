import { venueChatOfferTitleKey, type VenueChatLine, type VenueChatOfferMove, type VenueChatSide } from '@duncit/utils';

/** Who reads a thread: one of its two sides, or Duncit staff (read-only). */
export type OfferChatViewer = VenueChatSide | 'STAFF';

/** An OFFER line this client can draw as a card — a move it knows. Anything else falls back to the line's text. */
export function isOfferChatLine<L extends Pick<VenueChatLine, 'type' | 'offer'>>(
  line: L,
): line is L & { offer: VenueChatOfferMove } {
  return line.type === 'OFFER' && !!line.offer && venueChatOfferTitleKey(line.offer, 'HOST') !== '';
}

/**
 * The side a card's heading is written for. A member reads it as themselves;
 * staff read it as the side that did NOT move, so it says "The host …" or
 * "The venue …" rather than "You …".
 */
export const titleSideOf = (viewer: OfferChatViewer, by: string): VenueChatSide => {
  if (viewer !== 'STAFF') return viewer;
  return by === 'HOST' ? 'VENUE' : 'HOST';
};

/** OFFER and COUNTER wait on an answer; the rest close the offer (shared with the native app). */
export { isOpenOfferMove as isOpenMove } from '@duncit/utils';
