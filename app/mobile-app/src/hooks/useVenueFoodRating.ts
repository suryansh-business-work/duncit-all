import { useEffect, useState } from 'react';
import { logs } from '@duncit/logs';
import { hasFoodRating, type VenueFoodRating } from '@duncit/utils';

import { fetchVenueFoodRating } from '@/services/food-customer';
import { fireAndForget } from '@/utils/fire-and-forget';

/**
 * The venue's food rating, or null until somebody has rated (or while it
 * cannot be read — it is a nicety, never in the way of the menu).
 * RN twin of mWeb's food/FoodRatingBadge query.
 */
export function useVenueFoodRating(venueId: string): VenueFoodRating | null {
  const [rating, setRating] = useState<VenueFoodRating | null>(null);
  useEffect(() => {
    if (!venueId) return undefined;
    let active = true;
    fireAndForget(
      fetchVenueFoodRating(venueId)
        .then((next) => {
          if (active) setRating(hasFoodRating(next) ? next : null);
        })
        .catch((error: unknown) => logs.mobileApp.warn('venueFood', 'rating', { error, venueId })),
    );
    return () => {
      active = false;
    };
  }, [venueId]);
  return rating;
}
