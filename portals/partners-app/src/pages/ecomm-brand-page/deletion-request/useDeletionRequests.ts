import { useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import type { CatalogDeletionKind, CatalogDeletionStatus, QueryMyCatalogDeletionRequestsArgs } from '@duncit/gql-types';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { MY_CATALOG_DELETION_REQUESTS, type DeletionRequestRow } from './deletion.queries';

/** A request still in play — the item is off sale until it completes, is rejected or withdrawn. */
const OPEN_STATUSES: ReadonlySet<CatalogDeletionStatus> = new Set<CatalogDeletionStatus>(['PENDING', 'APPROVED']);

const targetKey = (kind: CatalogDeletionKind, id: string) => `${kind}:${id}`;
const targetOf = (request: DeletionRequestRow) =>
  targetKey(request.kind, request.kind === 'PRODUCT' ? request.product_id ?? '' : request.brand_id);

/** The partner's open deletion requests, looked up by the brand or product they are for. */
export function useDeletionRequests(brandId?: string | null) {
  const { data, error, refetch } = useQuery<{ myCatalogDeletionRequests: DeletionRequestRow[] }, QueryMyCatalogDeletionRequestsArgs>(
    MY_CATALOG_DELETION_REQUESTS,
    { variables: { brand_id: brandId ?? null }, fetchPolicy: 'cache-and-network' },
  );

  useEffect(() => {
    if (error) notifyError(parseApiError(error));
  }, [error]);

  const open = useMemo(() => {
    const byTarget = new Map<string, DeletionRequestRow>();
    for (const request of data?.myCatalogDeletionRequests ?? []) {
      if (OPEN_STATUSES.has(request.status) && !byTarget.has(targetOf(request))) byTarget.set(targetOf(request), request);
    }
    return byTarget;
  }, [data]);

  const openFor = useCallback(
    (kind: CatalogDeletionKind, id: string): DeletionRequestRow | null => open.get(targetKey(kind, id)) ?? null,
    [open],
  );
  const reload = useCallback(() => {
    refetch().catch((refetchError: unknown) => notifyError(parseApiError(refetchError)));
  }, [refetch]);

  return { openFor, reload };
}

export type DeletionLookup = ReturnType<typeof useDeletionRequests>['openFor'];
