import { useQuery } from '@apollo/client/react';
import { COIN_ADMIN_STATS, type CoinAdminStats } from '../duncit-coin/queries';
import { GIFT_CARD_ADMIN_STATS, type GiftCardAdminStats } from '../gift-cards/virtual/queries';
import { PHYSICAL_STATS, type PhysicalStats } from '../gift-cards/physical/queries';
import { REFERRAL_ADMIN_STATS, type ReferralAdminStats } from '../referrals/queries';

/** Every book the Loyalty home reads, each as its own dashboard reads it. */
export interface LoyaltyOverview {
  coins?: CoinAdminStats;
  cards?: GiftCardAdminStats;
  printed?: PhysicalStats;
  referrals?: ReferralAdminStats;
  /** True while a book has not answered its first read yet. */
  loading: { coins: boolean; cards: boolean; printed: boolean; referrals: boolean };
  /** True when any book could not be read — the page says so rather than showing zeros. */
  failed: boolean;
}

/**
 * The four stats reads behind the Loyalty home — the same documents and
 * variables the section dashboards send, so opening one after the other is
 * served from the cache instead of asking the server twice.
 */
export function useLoyaltyOverview(months: number): LoyaltyOverview {
  const options = { variables: { months }, fetchPolicy: 'cache-and-network' as const };
  const coin = useQuery<{ coinAdminStats: CoinAdminStats }>(COIN_ADMIN_STATS, options);
  const virtual = useQuery<{ giftCardAdminStats: GiftCardAdminStats }>(GIFT_CARD_ADMIN_STATS, options);
  const physical = useQuery<{ physicalGiftCardAdminStats: PhysicalStats }>(PHYSICAL_STATS, options);
  const referral = useQuery<{ referralAdminStats: ReferralAdminStats }>(REFERRAL_ADMIN_STATS, options);

  const coins = coin.data?.coinAdminStats;
  const cards = virtual.data?.giftCardAdminStats;
  const printed = physical.data?.physicalGiftCardAdminStats;
  const referrals = referral.data?.referralAdminStats;

  return {
    coins,
    cards,
    printed,
    referrals,
    loading: {
      coins: coin.loading && !coins,
      cards: virtual.loading && !cards,
      printed: physical.loading && !printed,
      referrals: referral.loading && !referrals,
    },
    failed: Boolean(coin.error || virtual.error || physical.error || referral.error),
  };
}

/** What Duncit owes in rewards, in reward value: 1 coin is worth 1 unit of currency. */
export const totalLiability = ({ coins, cards, printed }: LoyaltyOverview): number | null =>
  coins && cards && printed ? coins.total_outstanding + cards.outstanding_value + printed.outstanding_coins : null;
