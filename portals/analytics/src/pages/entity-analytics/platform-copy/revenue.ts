import type { PageCopy } from './types';

/** Money > Revenue & Finance. */
export const REVENUE_COPY: PageCopy = {
  kpis: {
    fin_collected: { title: 'analytics.kpi.finCollected', hint: 'analytics.kpi.finCollectedHint' },
    fin_refunds: { title: 'analytics.kpi.finRefunds', hint: 'analytics.kpi.finRefundsHint' },
    fin_refunded: { title: 'analytics.kpi.finRefunded', hint: 'analytics.kpi.finRefundedHint' },
    fin_refund_rate: { title: 'analytics.kpi.finRefundRate', hint: 'analytics.kpi.finRefundRateHint' },
    fin_net_revenue: { title: 'analytics.kpi.finNetRevenue', hint: 'analytics.kpi.finNetRevenueHint' },
    fin_duncit_revenue: { title: 'analytics.kpi.finDuncitRevenue', hint: 'analytics.kpi.finDuncitRevenueHint' },
    fin_gst: { title: 'analytics.kpi.finGst', hint: 'analytics.kpi.finGstHint' },
    fin_avg_payment: { title: 'analytics.kpi.finAvgPayment', hint: 'analytics.kpi.finAvgPaymentHint' },
    fin_paying_users: { title: 'analytics.kpi.finPayingUsers', hint: 'analytics.kpi.finPayingUsersHint' },
    fin_success_rate: { title: 'analytics.kpi.finSuccessRate', hint: 'analytics.kpi.finSuccessRateHint' },
    fin_payouts_released: { title: 'analytics.kpi.finPayoutsReleased', hint: 'analytics.kpi.finPayoutsReleasedHint' },
    fin_payouts_pending: { title: 'analytics.kpi.finPayoutsPending', hint: 'analytics.kpi.finPayoutsPendingHint' },
  },
  trends: {
    fin_money: { title: 'analytics.trend.finMoney', hint: 'analytics.trend.finMoneyHint' },
    fin_payments: { title: 'analytics.trend.finPayments', hint: 'analytics.trend.finPaymentsHint' },
    fin_payouts: { title: 'analytics.trend.finPayouts', hint: 'analytics.trend.finPayoutsHint' },
  },
  series: {
    fin_successful: 'analytics.series.finSuccessful',
    fin_failed: 'analytics.series.finFailed',
    fin_withdrawals_paid: 'analytics.series.finWithdrawalsPaid',
  },
  breakdowns: {
    fin_by_city: 'analytics.breakdown.finByCity',
    fin_by_category: 'analytics.breakdown.finByCategory',
    fin_by_method: 'analytics.breakdown.finByMethod',
    fin_by_purpose: 'analytics.breakdown.finByPurpose',
    fin_payout_split: 'analytics.breakdown.finPayoutSplit',
    fin_payouts_owed: 'analytics.breakdown.finPayoutsOwed',
  },
  slices: {
    fin_by_method: {
      RAZORPAY: 'analytics.slice.finRazorpay',
      COD: 'analytics.slice.finCod',
      COINS: 'analytics.slice.finCoins',
      COUPON: 'analytics.slice.finCoupon',
      DUMMY: 'analytics.slice.finDummy',
    },
    fin_by_purpose: {
      POD: 'analytics.slice.finPod',
      PRODUCT: 'analytics.slice.finProduct',
      GIFT_CARD: 'analytics.slice.finGiftCard',
      OTHER: 'analytics.slice.finOther',
    },
    fin_payout_split: {
      DUNCIT: 'analytics.slice.finDuncit',
      HOST_PAYMENT: 'analytics.slice.finHostPayment',
      VENUE_BILLING: 'analytics.slice.finVenueBilling',
      CLUB_ADMIN: 'analytics.slice.finClubAdmin',
      ECOMM_PAYMENT: 'analytics.slice.finEcommPayment',
    },
    fin_payouts_owed: {
      releases_pending: 'analytics.slice.finReleasesPending',
      wallet_balance: 'analytics.slice.finWalletBalance',
      withdrawals_pending: 'analytics.slice.finWithdrawalsPending',
    },
  },
  leaderboards: {
    fin_top_pods: {
      title: 'analytics.leaderboard.finTopPods',
      hint: 'analytics.leaderboard.finTopPodsHint',
      name: 'analytics.leaderboard.finPod',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    fin_col_collected: 'analytics.leaderboard.finColCollected',
    fin_col_payments: 'analytics.leaderboard.finColPayments',
    fin_col_avg_payment: 'analytics.leaderboard.finColAvgPayment',
    fin_col_refunded: 'analytics.leaderboard.finColRefunded',
  },
};
