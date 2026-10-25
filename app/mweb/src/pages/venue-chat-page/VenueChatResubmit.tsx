import { useEffect } from 'react';
import { useQuery } from '@apollo/client/react';
import { PodResubmitDialog } from '@duncit/host-pod-actions';
import { logs } from '@duncit/logs';
import { parseApiError, type VenueChatOfferMove } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { VENUE_CHAT_RESUBMIT_POD } from './queries';

interface Props {
  podId: string;
  /** The declined (or expired) move a new offer starts from; null while none is being sent. */
  move: VenueChatOfferMove | null;
  onClose: () => void;
  /** The new offer went to the venue. */
  onSaved: () => void;
  /** The pod could not be read — already worded for the reader. */
  onError: (message: string) => void;
}

/**
 * "Send a new offer" from the thread: reads the pod, then opens the same
 * resubmit dialog Your Pods uses, its offer prefilled from the move that was
 * declined — the time, the space, pets, the pricing, the points and the note.
 */
export default function VenueChatResubmit({ podId, move, onClose, onSaved, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, error } = useQuery(VENUE_CHAT_RESUBMIT_POD, { variables: { pod_doc_id: podId }, skip: !move });

  useEffect(() => {
    if (!move || !error) return;
    logs.mWeb.warn('venueChat', 'resubmitPod', { podId, error });
    onError(parseApiError(error, t('mweb.venueChat.newOfferFailed')));
    onClose();
  }, [move, error, podId, onError, onClose, t]);

  return (
    <PodResubmitDialog
      pod={move ? (data?.pod ?? null) : null}
      offerPrefill={move ?? undefined}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
