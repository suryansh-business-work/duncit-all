import { useState } from 'react';
import type { DocumentNode } from 'graphql';
import { useMutation } from '@apollo/client/react';
import type { SendPodPartnerRequestInput } from '@duncit/gql-types';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import { POD_REQUEST_QUOTA, SEND_POD_REQUEST } from '../queries';
import type { RequestNoteValues } from './request-note';
import type { NearbyCardData } from './NearbyResultCard';

interface Options {
  /** The mutation input for one card — direction, venue and host. */
  toInput: (item: NearbyCardData, note: string | null) => SendPodPartnerRequestInput;
  /** The search to re-run, so the card shows "Requested" instead of the button. */
  search: DocumentNode;
}

/**
 * Request Pod on a result card: the dialog's target, the send, and what came
 * back. A refusal (LIMIT_REACHED, CONFLICT) stays in the open dialog; success
 * closes it and says so above the results.
 */
export function useRequestPod({ toInput, search }: Readonly<Options>) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<NearbyCardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentText, setSentText] = useState<string | null>(null);
  const [send, state] = useMutation(SEND_POD_REQUEST, {
    refetchQueries: [POD_REQUEST_QUOTA, search],
    awaitRefetchQueries: true,
  });

  const submit = async (values: RequestNoteValues) => {
    if (!target) return;
    setError(null);
    try {
      await send({ variables: { input: toInput(target, values.note || null) } });
      setTarget(null);
      setSentText(t('podRequests.requestSent'));
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return {
    target,
    error,
    sending: state.loading,
    sentText,
    clearSent: () => setSentText(null),
    open: (item: NearbyCardData) => {
      setError(null);
      setSentText(null);
      setTarget(item);
    },
    close: () => setTarget(null),
    submit: (values: RequestNoteValues) => {
      submit(values).catch((err: unknown) => setError(parseApiError(err)));
    },
  };
}
