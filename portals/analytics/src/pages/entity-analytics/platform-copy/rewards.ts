import type { PageCopy } from './types';

/** Money > Coins, Referrals & Gift Cards. */
export const REWARDS_COPY: PageCopy = {
  kpis: {
    rew_coins_credited: { title: 'analytics.kpi.rewCoinsCredited', hint: 'analytics.kpi.rewCoinsCreditedHint' },
    rew_coins_spent: { title: 'analytics.kpi.rewCoinsSpent', hint: 'analytics.kpi.rewCoinsSpentHint' },
    rew_coins_expired: { title: 'analytics.kpi.rewCoinsExpired', hint: 'analytics.kpi.rewCoinsExpiredHint' },
    rew_coins_outstanding: { title: 'analytics.kpi.rewCoinsOutstanding', hint: 'analytics.kpi.rewCoinsOutstandingHint' },
    rew_coin_checkout_value: {
      title: 'analytics.kpi.rewCoinCheckoutValue',
      hint: 'analytics.kpi.rewCoinCheckoutValueHint',
    },
    rew_referrals_joined: { title: 'analytics.kpi.rewReferralsJoined', hint: 'analytics.kpi.rewReferralsJoinedHint' },
    rew_referral_conversion: {
      title: 'analytics.kpi.rewReferralConversion',
      hint: 'analytics.kpi.rewReferralConversionHint',
    },
    rew_referral_coins: { title: 'analytics.kpi.rewReferralCoins', hint: 'analytics.kpi.rewReferralCoinsHint' },
    rew_gift_cards_sold: { title: 'analytics.kpi.rewGiftCardsSold', hint: 'analytics.kpi.rewGiftCardsSoldHint' },
    rew_gift_card_value_sold: {
      title: 'analytics.kpi.rewGiftCardValueSold',
      hint: 'analytics.kpi.rewGiftCardValueSoldHint',
    },
    rew_gift_card_redeemed: { title: 'analytics.kpi.rewGiftCardRedeemed', hint: 'analytics.kpi.rewGiftCardRedeemedHint' },
    rew_gift_card_outstanding: {
      title: 'analytics.kpi.rewGiftCardOutstanding',
      hint: 'analytics.kpi.rewGiftCardOutstandingHint',
    },
  },
  trends: {
    rew_coins: { title: 'analytics.trend.rewCoins', hint: 'analytics.trend.rewCoinsHint' },
    rew_referrals: { title: 'analytics.trend.rewReferrals', hint: 'analytics.trend.rewReferralsHint' },
    rew_gift_cards: { title: 'analytics.trend.rewGiftCards', hint: 'analytics.trend.rewGiftCardsHint' },
  },
  series: {
    rew_referral_codes: 'analytics.series.rewReferralCodes',
  },
  breakdowns: {
    rew_credit_sources: 'analytics.breakdown.rewCreditSources',
    rew_debit_sources: 'analytics.breakdown.rewDebitSources',
    rew_balance_bands: 'analytics.breakdown.rewBalanceBands',
    rew_gift_card_themes: 'analytics.breakdown.rewGiftCardThemes',
    rew_gift_card_status: 'analytics.breakdown.rewGiftCardStatus',
  },
  slices: {
    rew_credit_sources: {
      PAYMENT_EARN: 'analytics.slice.rewPaymentEarn',
      REFERRAL_EARN: 'analytics.slice.rewReferralEarn',
      REFERRAL_SIGNUP: 'analytics.slice.rewReferralSignup',
      POD_FEEDBACK: 'analytics.slice.rewPodFeedback',
      GIFT_CARD_REDEEM: 'analytics.slice.rewGiftCardRedeem',
      PAYMENT_REFUND: 'analytics.slice.rewPaymentRefund',
      ADMIN_GRANT: 'analytics.slice.rewAdminGrant',
    },
    rew_debit_sources: {
      PAYMENT_REDEEM: 'analytics.slice.rewPaymentRedeem',
      COIN_EXPIRY: 'analytics.slice.rewCoinExpiry',
      ADMIN_DEDUCT: 'analytics.slice.rewAdminDeduct',
    },
    rew_balance_bands: {
      balance_under_50: 'analytics.slice.rewBalanceUnder50',
      balance_50_199: 'analytics.slice.rewBalance50To199',
      balance_200_499: 'analytics.slice.rewBalance200To499',
      balance_500_plus: 'analytics.slice.rewBalance500Plus',
    },
    rew_gift_card_themes: {
      SHOP: 'analytics.slice.rewShop',
    },
    rew_gift_card_status: {
      ACTIVE: 'analytics.slice.rewCardActive',
      REDEEMED: 'analytics.slice.rewCardRedeemed',
      EXPIRED: 'analytics.slice.rewCardExpired',
    },
  },
  leaderboards: {
    rew_top_referrers: {
      title: 'analytics.leaderboard.rewTopReferrers',
      hint: 'analytics.leaderboard.rewTopReferrersHint',
      name: 'analytics.leaderboard.rewMember',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    rew_col_joined: 'analytics.leaderboard.rewColJoined',
    rew_col_converted: 'analytics.leaderboard.rewColConverted',
    rew_col_conversion: 'analytics.leaderboard.rewColConversion',
    rew_col_coins: 'analytics.leaderboard.rewColCoins',
  },
};
