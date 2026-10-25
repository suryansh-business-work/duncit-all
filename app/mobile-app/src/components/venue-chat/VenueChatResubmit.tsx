import { useEffect, useRef, useState } from 'react';
import { logs } from '@duncit/logs';
import type { VenueChatOfferMove } from '@duncit/utils';

import { PodResubmitDialog } from '@/components/host-manage/PodResubmitDialog';
import type { HostPodForResubmit } from '@/components/host-manage/pod-resubmit.form';
import { VenueChatResubmitPodDocument } from '@/graphql/venue-chat';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

interface Props {
  podId: string;
  /** The declined (or expired) move a new offer starts from; null while none is being sent. */
  move: VenueChatOfferMove | null;
  onClose: () => void;
  /** The pod could not be read — already worded for the reader. */
  onError: (message: string) => void;
}

/**
 * "Send a new offer" from the thread: reads the pod, then opens the same
 * resubmit sheet Your Pods uses, its offer prefilled from the move that was
 * declined — the time, the space, pets, the pricing, the points and the note.
 * The new offer posts its own OFFER line, and that line re-reads the live
 * offer. mWeb twin: VenueChatResubmit.
 */
export function VenueChatResubmit({ podId, move, onClose, onError }: Readonly<Props>) {
  const { t } = useTranslation();
  const [pod, setPod] = useState<HostPodForResubmit | null>(null);
  // The latest callbacks, so a parent re-render never re-reads the pod.
  const handlers = useRef({ onClose, onError });
  handlers.current = { onClose, onError };
  const failedText = t('mweb.venueChat.newOfferFailed');

  useEffect(() => {
    setPod(null);
    if (!move) return undefined;
    let active = true;
    const fail = (message: string) => {
      handlers.current.onError(message);
      handlers.current.onClose();
    };
    graphqlRequest(VenueChatResubmitPodDocument, { podId }, { auth: true })
      .then((res) => {
        if (!active) return;
        if (res.pod) setPod(res.pod);
        else fail(failedText);
      })
      .catch((error: unknown) => {
        if (!active) return;
        logs.mobileApp.warn('venueChat', 'resubmitPod', { podId, error });
        fail(toErrorMessage(error, failedText));
      });
    return () => {
      active = false;
    };
  }, [move, podId, failedText]);

  return (
    <PodResubmitDialog
      pod={move ? pod : null}
      offerPrefill={move}
      onClose={onClose}
      onSaved={onClose}
    />
  );
}
