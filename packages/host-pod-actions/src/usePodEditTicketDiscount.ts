import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { DEFAULT_TICKET_DISCOUNT_MAX_PCT } from '@duncit/utils';
import { podEditTicketDiscount, type PodEditTicketDiscount } from './pod-edit-ticket-discount';
import type { HostPodTarget } from './types';

interface PublicTicketDiscountSettings {
  publicAppSettings?: { ticket_discount_max_pct?: number | null } | null;
}

/**
 * The edit dialog's discount context, with the admin's max % read from the ONE
 * `PublicAppSettings` operation every surface shares (so the cache never thrashes
 * between two selections of it). The default stands in only while it loads.
 */
export function usePodEditTicketDiscount(pod: HostPodTarget | null): PodEditTicketDiscount | null {
  const { data } = useQuery<PublicTicketDiscountSettings>(PUBLIC_APP_SETTINGS, {
    fetchPolicy: 'cache-first',
    skip: !pod,
  });
  const maxPct = data?.publicAppSettings?.ticket_discount_max_pct ?? DEFAULT_TICKET_DISCOUNT_MAX_PCT;
  return useMemo(() => podEditTicketDiscount(pod, maxPct), [pod, maxPct]);
}
