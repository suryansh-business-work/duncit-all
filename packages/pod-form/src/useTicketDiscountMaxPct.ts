import { useQuery } from '@apollo/client/react';
import { PUBLIC_APP_SETTINGS } from '@duncit/app-settings';
import { DEFAULT_TICKET_DISCOUNT_MAX_PCT } from '@duncit/utils';

interface PublicTicketDiscountSettings {
  publicAppSettings?: { ticket_discount_max_pct?: number | null } | null;
}

/**
 * The admin's ceiling on every multi-ticket tier (Admin > Pods > Pod Settings),
 * read off the monorepo's one `PublicAppSettings` operation so it shares the
 * cache entry the date formatter already fetched. The shipped default stands
 * in only until that query answers — the server re-checks on save either way.
 */
export function useTicketDiscountMaxPct(): number {
  const { data } = useQuery<PublicTicketDiscountSettings>(PUBLIC_APP_SETTINGS, {
    fetchPolicy: 'cache-first',
  });
  return data?.publicAppSettings?.ticket_discount_max_pct ?? DEFAULT_TICKET_DISCOUNT_MAX_PCT;
}
