import { useLiveQuote, type LiveQuoteSource } from '../useLiveQuote';
import type { WindowOfferInput } from './window-offer.types';

/**
 * Which server query prices a proposal, and how the proposal becomes its
 * variables — each flow (Pod Request, Auto Pod, Change Request) has its own,
 * all answering `{ ok, message, quote }`.
 */
export type WindowQuoteSource = LiveQuoteSource<WindowOfferInput>;

/** The server's price for the window and terms being typed; a null offer (form not ready) asks nothing. */
export function useWindowQuote(source: WindowQuoteSource, offer: WindowOfferInput | null) {
  return useLiveQuote(source, offer);
}
