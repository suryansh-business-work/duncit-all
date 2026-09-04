import { useEffect, useState } from 'react';

import type { AutoPodVenueSpace } from '@duncit/utils';

import { MyVenuesForAutoPodDocument } from '@/graphql/auto-pods';
import { graphqlRequest } from '@/services/graphql.client';

/** One of the owner's venues, as the queue and the accept sheet need it. */
export interface AutoPodVenueOption {
  id: string;
  venue_name: string;
  location_id: string | null;
  city: string;
  /** The whole venue's seats: what stands in when no space is named. */
  capacity: number;
  /** The venue's named spaces, which its potential-earnings sheet prices. */
  capacity_items: AutoPodVenueSpace[];
  venue_category: {
    sub_category_id: string | null;
    super_category_name: string;
    category_name: string;
    sub_category_name: string;
  } | null;
}

/** "Sports › Racket › Badminton" — the venue's declared category. */
export function venueCategoryPath(venue: AutoPodVenueOption | null): string {
  const category = venue?.venue_category;
  if (!category) return '';
  return [category.super_category_name, category.category_name, category.sub_category_name]
    .filter(Boolean)
    .join(' › ');
}

/**
 * The owner's approved, active venues — the ones that can be offered an Auto
 * Pod. The RN twin of the query `@duncit/auto-pods`' `AutoPodVenuePicker`
 * runs (rule 27).
 */
export function useAutoPodVenues() {
  const [venues, setVenues] = useState<AutoPodVenueOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    graphqlRequest(MyVenuesForAutoPodDocument, undefined, { auth: true })
      .then((res) => {
        if (!active) return;
        setVenues(
          res.myVenues
            .filter((venue) => String(venue.status) === 'APPROVED' && venue.is_active)
            .map((venue) => ({
              id: venue.id,
              venue_name: venue.venue_name,
              location_id: venue.location_id ?? null,
              city: venue.city,
              capacity: venue.capacity ?? 0,
              capacity_items: (venue.capacity_items ?? []).map((item) => ({
                label: item.label,
                capacity: item.capacity,
              })),
              venue_category: venue.venue_category
                ? {
                    sub_category_id: venue.venue_category.sub_category_id ?? null,
                    super_category_name: venue.venue_category.super_category_name,
                    category_name: venue.venue_category.category_name,
                    sub_category_name: venue.venue_category.sub_category_name,
                  }
                : null,
            })),
        );
      })
      .catch(() => undefined)
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, []);

  return { venues, loaded };
}
