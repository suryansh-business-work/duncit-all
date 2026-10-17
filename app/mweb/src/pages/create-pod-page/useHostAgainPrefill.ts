import { useSearchParams } from 'react-router';
import { gql, type TypedDocumentNode } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { HOST_AGAIN_PARAM } from '@duncit/utils';

export interface HostAgainPrefill {
  source_pod_id: string;
  source_title: string;
  payload: string;
  step: number;
  notices: string[];
}

const HOST_AGAIN_PREFILL: TypedDocumentNode<
  { hostAgainPrefill: HostAgainPrefill },
  { pod_doc_id: string }
> = gql`
  query CreatePodHostAgainPrefill($pod_doc_id: ID!) {
    hostAgainPrefill(pod_doc_id: $pod_doc_id) {
      source_pod_id
      source_title
      payload
      step
      notices
    }
  }
`;

/**
 * `/create-pod?host_again=<podId>` — the form filled from one of the host's
 * earlier pods. Nothing is saved here: the stepper creates the draft when the
 * host moves on, so opening and closing it leaves no empty draft behind.
 */
export function useHostAgainPrefill(enabled: boolean) {
  const [params] = useSearchParams();
  const podId = enabled ? (params.get(HOST_AGAIN_PARAM) ?? '') : '';
  const query = useQuery(HOST_AGAIN_PREFILL, {
    variables: { pod_doc_id: podId },
    skip: !podId,
    fetchPolicy: 'network-only',
  });
  return {
    prefill: podId ? (query.data?.hostAgainPrefill ?? null) : null,
    loading: !!podId && query.loading && !query.data,
    failed: !!podId && !!query.error,
  };
}
