import { useCallback, useEffect, useRef, useState } from 'react';

import type { VenuePricingInput } from '@/generated/graphql/graphql';
import type { SavedPricing } from '@/forms/venue-pricing';
import { UpdateVenuePricingDocument, VenuePricingDocument } from '@/graphql/venue-pricing';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

/**
 * One venue's saved pricing and the one write that replaces it.
 *
 * `save` re-reads after the write rather than patching local state: the
 * server normalises what it stores (sorted days, rounded money), and the form
 * and the calendar must both start from exactly that. A failed save rejects,
 * so the caller words the failure where the owner is looking.
 */
export function useVenuePricing(venueId: string | null) {
  const { t } = useTranslation();
  const [pricing, setPricing] = useState<SavedPricing | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Another venue's pricing must never seed this one's form while it loads,
  // nor a late answer for the venue the owner just switched away from.
  const current = useRef(venueId);
  useEffect(() => {
    current.current = venueId;
    setPricing(null);
    setError(null);
  }, [venueId]);

  const load = useCallback(async () => {
    if (!venueId) return;
    const data = await graphqlRequest(VenuePricingDocument, { venue_id: venueId }, { auth: true });
    if (current.current !== venueId) return;
    setPricing(data.venuePricing);
    setError(null);
  }, [venueId]);

  const { isLoading, refetch } = useReloadableQuery(load, {
    enabled: !!venueId,
    onError: (e) => setError(toErrorMessage(e, t('availability.pricingModule.loadFailed'))),
  });

  const save = useCallback(
    async (input: VenuePricingInput) => {
      if (!venueId) return;
      await graphqlRequest(
        UpdateVenuePricingDocument,
        { venue_id: venueId, input },
        { auth: true },
      );
      await load();
    },
    [venueId, load],
  );

  return { pricing, isLoading: !!venueId && isLoading, error, refetch, save };
}
