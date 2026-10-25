import { useCallback, useState } from 'react';
import { logs } from '@duncit/logs';
import { isOfferChangedError } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { errorReason, toErrorMessage } from '@/utils/errors';

/** What the reader is told once a sheet closes: it went through, or the terms moved first. */
export interface OfferNotice {
  tone: 'success' | 'warning';
  text: string;
}

/** The state every booking-offer answer shares — either side, any move. */
export interface OfferAnswerState {
  busy: boolean;
  /** Why the open sheet's answer was refused; the sheet stays open to show it. */
  error: string | null;
  notice: OfferNotice | null;
  clearError: () => void;
  clearNotice: () => void;
}

/**
 * One answer to a booking offer (accept, reject, counter — either side): run
 * it and, once it is saved, say so and re-read. When the other side moved
 * first or the offer ran out (OFFER_CHANGED) the answer was not made: say the
 * terms changed and re-read, so the latest are on screen. Any other refusal
 * keeps the sheet open with the server's reason. `run` resolves true when the
 * sheet should close. mWeb twin: useOfferMutation.
 */
export function useOfferAnswer(reread: () => Promise<unknown>, logTag: string) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<OfferNotice | null>(null);

  const refresh = useCallback(async () => {
    try {
      await reread();
    } catch (err: unknown) {
      // A failed re-read only leaves the offer a moment stale; the answer stands.
      logs.mobileApp.warn(logTag, 'refresh', { error: err });
    }
  }, [reread, logTag]);

  const run = useCallback(
    async (request: () => Promise<unknown>, doneText: string): Promise<boolean> => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        await request();
        setNotice({ tone: 'success', text: doneText });
      } catch (err: unknown) {
        logs.mobileApp.warn(logTag, 'answer', { error: err });
        if (!isOfferChangedError(errorReason(err))) {
          setError(toErrorMessage(err, t('availability.offers.failed')));
          setBusy(false);
          return false;
        }
        setNotice({ tone: 'warning', text: t('availability.offers.offerChanged') });
      }
      await refresh();
      setBusy(false);
      return true;
    },
    [logTag, refresh, t],
  );

  const state: OfferAnswerState = {
    busy,
    error,
    notice,
    clearError: () => setError(null),
    clearNotice: () => setNotice(null),
  };
  return { ...state, run };
}

/** The round an answer carries; nothing for a request from before offers (null). */
export const roundOf = (round: number | null): { round?: number } =>
  round === null ? {} : { round };
