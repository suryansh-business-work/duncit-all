import { useMemo } from 'react';
import type { ProfileMenuFlags } from '@duncit/utils';

import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { PRODUCT_VISIBILITY_FLAG } from '@/hooks/useProductVisibility';

/** The server flags the account menu's catalogue is gated on, read through the
 * app's own flag hook. Stable until a flag flips, so what is built from it can
 * be memoised. mWeb twin: profile-drawer/useMenuFlags. */
export function useMenuFlags(): ProfileMenuFlags {
  const podPlans = useFeatureFlag('pod_plans_section');
  const leaderboard = useFeatureFlag('leaderboard');
  const membership = useFeatureFlag('membership');
  const giftCards = useFeatureFlag('gift_cards');
  const tourGuide = useFeatureFlag('tour_guide');
  const products = useFeatureFlag(PRODUCT_VISIBILITY_FLAG);
  return useMemo(
    () => ({
      pod_plans_section: podPlans,
      leaderboard,
      membership,
      gift_cards: giftCards,
      tour_guide: tourGuide,
      products,
    }),
    [podPlans, leaderboard, membership, giftCards, tourGuide, products],
  );
}
