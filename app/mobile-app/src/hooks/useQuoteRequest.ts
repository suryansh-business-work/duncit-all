import { useEffect, useRef, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';

import type { OfferQuoteResultFragment } from '@/graphql/venue-offer';

/** The answer every offer price query returns (`MobileOfferQuoteResult`). */
export type OfferQuoteAnswer = ResultOf<typeof OfferQuoteResultFragment>;
export type HostVenueQuote = NonNullable<OfferQuoteAnswer['quote']>;

const QUOTE_DEBOUNCE_MS = 300;

/**
 * One server price for a window and its terms — the offer as typed, priced
 * with the venue's rules, fees, minimum spend and GST, Duncit's commission on
 * top — or why it cannot be sent (`message`). Debounced, so typing an amount
 * or stepping guests asks once rather than per tap; `key` null asks nothing.
 * `ask` is the surface's own query (Create Pod, a Pod Request, an Auto Pod's
 * accept, a venue taking over a pod); `key` must change whenever its inputs do.
 */
export function useQuoteRequest(
  key: string | null,
  ask: () => Promise<OfferQuoteAnswer>,
  logTag: string,
) {
  const [quote, setQuote] = useState<HostVenueQuote | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  // The latest query, read when the debounce fires: `key` already encodes its
  // inputs, so a new closure each render must not re-ask.
  const askRef = useRef(ask);
  askRef.current = ask;

  useEffect(() => {
    setQuote(null);
    setMessage(null);
    setError(null);
    if (!key) {
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(() => {
      askRef
        .current()
        .then((answer) => {
          if (!active) return;
          setQuote(answer.ok ? (answer.quote ?? null) : null);
          setMessage(answer.ok ? null : (answer.message ?? null));
        })
        .catch((err: unknown) => {
          if (!active) return;
          setError(err);
          logs.mobileApp.warn(logTag, 'quote', { error: err });
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, QUOTE_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [key, logTag]);

  return { quote, message, loading, error };
}
