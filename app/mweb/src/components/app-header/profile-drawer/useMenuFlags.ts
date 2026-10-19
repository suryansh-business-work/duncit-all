import { useMemo } from 'react';
import { PRODUCT_VISIBILITY_FLAG } from '@duncit/app-settings';
import type { ProfileMenuFlags } from '@duncit/utils';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

/** The server flags the account menu's catalogue is gated on. Stable until a
 * flag flips, so what is built from it can be memoised. Native twin:
 * components/Sidebar/useMenuFlags. */
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
    [podPlans, leaderboard, membership, giftCards, tourGuide, products]
  );
}
