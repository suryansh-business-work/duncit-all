import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { PodPartnerRequestDocument, PodRequestPodLinkDocument } from '@/graphql/pod-requests';
import { usePodRequestActions } from '@/hooks/usePodRequestActions';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

export type PodRequestDetail = ResultOf<typeof PodPartnerRequestDocument>['podPartnerRequest'];
type PodLink = NonNullable<ResultOf<typeof PodRequestPodLinkDocument>['pod']>;

/**
 * One Pod Request, for either side — where its notifications land — with the
 * moves it allows and, once the pod exists, the pod's public address for
 * "View pod". mWeb twin: pod-request-detail-page.
 */
export function usePodRequestDetail(id: string) {
  const { t } = useTranslation();
  const [request, setRequest] = useState<PodRequestDetail | null>(null);
  const [pod, setPod] = useState<PodLink | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await graphqlRequest(PodPartnerRequestDocument, { id }, { auth: true });
    const next = res.podPartnerRequest;
    setRequest(next);
    setError(null);
    if (next.pod_id) {
      const link = await graphqlRequest(
        PodRequestPodLinkDocument,
        { pod_doc_id: next.pod_id },
        { auth: true },
      );
      setPod(link.pod ?? null);
    }
  }, [id]);

  const { isLoading, refetch } = useReloadableQuery(load, {
    enabled: !!id,
    onError: (err) => setError(toErrorMessage(err, t('podRequests.notFound'))),
  });
  const actions = usePodRequestActions(refetch);

  return { request, pod, error, isLoading: !!id && isLoading, actions };
}
