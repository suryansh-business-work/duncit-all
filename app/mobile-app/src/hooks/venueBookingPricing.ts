import { useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';

import { HostBookingPricingDocument } from '@/graphql/venue-booking';
import { graphqlRequest } from '@/services/graphql.client';

export type VenueBookingPricing = ResultOf<typeof HostBookingPricingDocument>['venuePricing'];

/** How long one venue's pricing answer is reused before it is read again. */
const FRESH_MS = 60_000;

const reads = new Map<string, { at: number; answer: Promise<VenueBookingPricing> }>();

/**
 * A venue's booking pricing, read once and shared: Step 3's picker and the
 * stepper's spot bounds both need it, and the app has no query cache to
 * dedupe the two. `fresh` (pull-to-refresh) always asks the server again. A
 * failed read is forgotten so the next ask retries.
 */
export function loadVenueBookingPricing(
  venueId: string,
  fresh = false,
): Promise<VenueBookingPricing> {
  const cached = reads.get(venueId);
  if (cached && !fresh && Date.now() - cached.at < FRESH_MS) return cached.answer;
  const answer = graphqlRequest(
    HostBookingPricingDocument,
    { venue_id: venueId },
    { auth: true },
  ).then((res) => res.venuePricing);
  reads.set(venueId, { at: Date.now(), answer });
  answer.catch(() => reads.delete(venueId));
  return answer;
}

/** The venue's guest range for the spot bounds — null until read, or when off. */
export function useVenueGuestRange(venueId: string): { min_pax: number; max_pax: number } | null {
  const [range, setRange] = useState<{ min_pax: number; max_pax: number } | null>(null);
  useEffect(() => {
    setRange(null);
    if (!venueId) return undefined;
    let active = true;
    loadVenueBookingPricing(venueId)
      .then((pricing) => active && setRange({ min_pax: pricing.min_pax, max_pax: pricing.max_pax }))
      .catch((error: unknown) =>
        logs.mobileApp.warn('venueBookingPricing', 'guest range', { error }),
      );
    return () => {
      active = false;
    };
  }, [venueId]);
  return range;
}
