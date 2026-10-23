import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { DocumentNode } from 'graphql';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { createLogger } from '@duncit/logs';
import { errorText } from '../pricing/format';

const logger = createLogger('portal');

/**
 * One answer to a booking request (accept, reject, counter): run it, show the
 * server's reason in the dialog when it is refused, and once it is saved say so,
 * close, and re-read the list — a failed re-read only leaves it a moment stale.
 */
export function useOfferMutation(document: DocumentNode, slotId: string, onClose: () => void, onDone: () => unknown) {
  const { t } = useTranslation();
  const [mutate, state] = useMutation(document);
  const [error, setError] = useState<string | null>(null);

  const run = async (variables: Record<string, unknown>, doneText: string) => {
    setError(null);
    try {
      await mutate({ variables: { slot_id: slotId, ...variables } });
    } catch (e) {
      setError(errorText(e, t('availability.offers.failed')));
      logger.warn('venueOffer', 'answer', { error: e, slot_id: slotId });
      return;
    }
    notifySuccess(doneText);
    onClose();
    try {
      await onDone();
    } catch (e) {
      logger.warn('venueOffer', 'refresh', { error: e, slot_id: slotId });
    }
  };

  return { run, busy: state.loading, error, clearError: () => setError(null) };
}
