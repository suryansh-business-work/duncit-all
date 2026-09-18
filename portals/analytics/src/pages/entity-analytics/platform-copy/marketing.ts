import type { PageCopy } from './types';

/**
 * Business > Marketing. Link sources and mediums carry their names from the
 * server's own option list (the Short Links console's dropdown words), and
 * coupon codes and cities are named by the data, so only the journey steps
 * need slice words here.
 */
export const MARKETING_COPY: PageCopy = {
  kpis: {
    mkt_links_created: { title: 'analytics.kpi.mktLinksCreated', hint: 'analytics.kpi.mktLinksCreatedHint' },
    mkt_clicks: { title: 'analytics.kpi.mktClicks', hint: 'analytics.kpi.mktClicksHint' },
    mkt_signups: { title: 'analytics.kpi.mktSignups', hint: 'analytics.kpi.mktSignupsHint' },
    mkt_signup_rate: { title: 'analytics.kpi.mktSignupRate', hint: 'analytics.kpi.mktSignupRateHint' },
    mkt_bookings: { title: 'analytics.kpi.mktBookings', hint: 'analytics.kpi.mktBookingsHint' },
    mkt_link_revenue: { title: 'analytics.kpi.mktLinkRevenue', hint: 'analytics.kpi.mktLinkRevenueHint' },
    mkt_coupons_redeemed: { title: 'analytics.kpi.mktCouponsRedeemed', hint: 'analytics.kpi.mktCouponsRedeemedHint' },
    mkt_discount_given: { title: 'analytics.kpi.mktDiscountGiven', hint: 'analytics.kpi.mktDiscountGivenHint' },
    mkt_waitlist_joins: { title: 'analytics.kpi.mktWaitlistJoins', hint: 'analytics.kpi.mktWaitlistJoinsHint' },
    mkt_cities_launched: { title: 'analytics.kpi.mktCitiesLaunched', hint: 'analytics.kpi.mktCitiesLaunchedHint' },
    mkt_cities_waiting: { title: 'analytics.kpi.mktCitiesWaiting', hint: 'analytics.kpi.mktCitiesWaitingHint' },
    mkt_campaigns_sent: { title: 'analytics.kpi.mktCampaignsSent', hint: 'analytics.kpi.mktCampaignsSentHint' },
  },
  trends: {
    mkt_traffic: { title: 'analytics.trend.mktTraffic', hint: 'analytics.trend.mktTrafficHint' },
    mkt_results: { title: 'analytics.trend.mktResults', hint: 'analytics.trend.mktResultsHint' },
    mkt_money: { title: 'analytics.trend.mktMoney', hint: 'analytics.trend.mktMoneyHint' },
  },
  series: {},
  breakdowns: {
    mkt_clicks_by_source: 'analytics.breakdown.mktClicksBySource',
    mkt_clicks_by_medium: 'analytics.breakdown.mktClicksByMedium',
    mkt_click_funnel: 'analytics.breakdown.mktClickFunnel',
    mkt_coupons_by_code: 'analytics.breakdown.mktCouponsByCode',
    mkt_waitlist_by_city: 'analytics.breakdown.mktWaitlistByCity',
    mkt_waitlist_progress: 'analytics.breakdown.mktWaitlistProgress',
  },
  slices: {
    mkt_click_funnel: {
      CLICKED: 'analytics.slice.mktStepClicked',
      LANDED: 'analytics.slice.mktStepLanded',
      SIGNED_UP: 'analytics.slice.mktStepSignedUp',
      SURVEY_DONE: 'analytics.slice.mktStepSurveyDone',
      VIEWED_POD: 'analytics.slice.mktStepViewedPod',
      CHECKOUT_STARTED: 'analytics.slice.mktStepCheckoutStarted',
      PAID: 'analytics.slice.mktStepPaid',
    },
  },
  leaderboards: {
    mkt_top_links: {
      title: 'analytics.leaderboard.mktTopLinks',
      hint: 'analytics.leaderboard.mktTopLinksHint',
      name: 'analytics.leaderboard.mktLink',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    mkt_clicks: 'analytics.leaderboard.mktClicks',
    mkt_signups: 'analytics.leaderboard.mktSignups',
    mkt_paid_clicks: 'analytics.leaderboard.mktPaidClicks',
    mkt_earned: 'analytics.leaderboard.mktEarned',
  },
};
