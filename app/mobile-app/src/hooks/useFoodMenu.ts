import { useCallback, useState } from 'react';
import type { FoodMenuConfig, FoodMenuVenue } from '@duncit/utils';

import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import { fetchFoodMenuConfig, fetchOwnerFoodMenu } from '@/services/venue-food-menu';
import { toErrorMessage } from '@/utils/errors';

/**
 * One venue's food block and the menu's caps, read together — the menu form
 * cannot be drawn without both. `replaceVenue` takes the server's copy after a
 * save, so the screen re-opens on it without asking again.
 */
export function useFoodMenu(venueId: string) {
  const { t } = useTranslation();
  const [venue, setVenue] = useState<FoodMenuVenue | null>(null);
  const [config, setConfig] = useState<FoodMenuConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [nextVenue, nextConfig] = await Promise.all([
      fetchOwnerFoodMenu(venueId),
      fetchFoodMenuConfig(),
    ]);
    setVenue(nextVenue);
    setConfig(nextConfig);
    setError(nextVenue ? null : t('venueFoodOwner.menu.loadFailed'));
  }, [t, venueId]);
  const query = useReloadableQuery(load, {
    onError: (err) => setError(toErrorMessage(err, t('venueFoodOwner.menu.loadFailed'))),
  });

  return {
    venue,
    config,
    error,
    isLoading: query.isLoading,
    refetch: query.refetch,
    replaceVenue: setVenue,
  };
}
