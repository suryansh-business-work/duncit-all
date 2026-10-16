import { useCallback, useState } from 'react';
import type { PodRentalCatalogue, PublicRentalSettings, RentalClosedReason } from '@duncit/utils';

import { PodRentalsDocument, PublicRentalSettingsDocument } from '@/graphql/rentals';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { graphqlRequest } from '@/services/graphql.client';

const CLOSED_REASONS: readonly RentalClosedReason[] = ['DISABLED', 'NO_VENUE', 'CUTOFF'];

type CatalogueResult = Awaited<ReturnType<typeof fetchCatalogue>>;

const fetchCatalogue = async (podId: string) =>
  (await graphqlRequest(PodRentalsDocument, { pod_id: podId })).podRentals;

/** The generated enums are TS enums; the shared contract reads plain strings. */
function toCatalogue(data: CatalogueResult): PodRentalCatalogue {
  const reason = CLOSED_REASONS.find((value) => value === data.closed_reason) ?? null;
  return {
    open: data.open,
    closed_reason: reason,
    hours: data.hours,
    currency_symbol: data.currency_symbol,
    items: data.items.map((item) => ({
      ...item,
      unit: String(item.unit) === 'HOUR' ? 'HOUR' : 'SLOT',
    })),
  };
}

/**
 * What a pod's venue rents out, how much is left, and the rules a guest
 * agrees to. Skipped for a pod with no venue (virtual or not yet placed).
 * RN twin of mWeb's usePodRentals.
 */
export function usePodRentals(podId: string, enabled: boolean) {
  const [catalogue, setCatalogue] = useState<PodRentalCatalogue | null>(null);
  const [settings, setSettings] = useState<PublicRentalSettings | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const [items, rules] = await Promise.all([
      fetchCatalogue(podId),
      graphqlRequest(PublicRentalSettingsDocument),
    ]);
    setCatalogue(toCatalogue(items));
    setSettings(rules.publicRentalSettings);
    setFailed(false);
  }, [podId]);

  const query = useReloadableQuery(load, {
    enabled: enabled && !!podId,
    onError: () => setFailed(true),
  });
  return {
    catalogue,
    settings,
    failed,
    loading: enabled && query.isLoading && !catalogue,
    refetch: query.refetch,
  };
}

export type PodRentals = ReturnType<typeof usePodRentals>;
