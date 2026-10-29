import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { DocumentNode } from 'graphql';
import { useTranslation } from '@duncit/app-settings';
import { notify, notifySuccess } from '@duncit/dialogs';
import { createLogger } from '@duncit/logs';
import { errorText } from '../pricing/format';
import { isFreeNoCounter, isOfferChanged, targetVariables, type OfferTarget } from './offer-target';

const logger = createLogger('portal');

/**
 * One answer to a booking offer (accept, reject, counter — either side): run
 * it, show the server's reason in the dialog when it is refused, and once it is
 * saved say so, close, and re-read — a failed re-read only leaves it a moment
 * stale. When the other side moved first (OFFER_CHANGED) the answer was not
 * made: say the terms changed, close, and re-read so the latest are on screen.
 * A counter on a free booking (FREE_NO_COUNTER) says, in the reader's language,
 * that it can only be accepted or declined.
 */
export function useOfferMutation(document: DocumentNode, target: OfferTarget, onClose: () => void, onDone: () => unknown) {
  const { t } = useTranslation();
  const [mutate, state] = useMutation(document);
  const [error, setError] = useState<string | null>(null);
  const ids = targetVariables(target);

  const reread = async () => {
    try {
      await onDone();
    } catch (e) {
      logger.warn('venueOffer', 'refresh', { error: e, ...ids });
    }
  };

  const run = async (variables: Record<string, unknown>, doneText: string) => {
    setError(null);
    try {
      await mutate({ variables: { ...ids, ...variables } });
    } catch (e) {
      logger.warn('venueOffer', 'answer', { error: e, ...ids });
      if (!isOfferChanged(e)) {
        setError(isFreeNoCounter(e) ? t('availability.offers.freeNoCounters') : errorText(e, t('availability.offers.failed')));
        return;
      }
      notify(t('availability.offers.offerChanged'), 'warning');
      onClose();
      await reread();
      return;
    }
    notifySuccess(doneText);
    onClose();
    await reread();
  };

  return { run, busy: state.loading, error, clearError: () => setError(null) };
}
