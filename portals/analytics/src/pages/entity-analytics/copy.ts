/**
 * Server key → translation key, for everything an Analytics page names.
 *
 * The server sends stable keys (`pods_held`, `fill_band`…); the words live in
 * the `analytics.*` bundle. Every translation key is written out literally
 * here, once, because the localization gate finds keys by searching the source
 * for them — a key built at the call site would be invisible to it.
 */

import type { AnalyticsGranularity } from '@duncit/gql-types';
import { PLATFORM_COPY } from './platform-copy';

/** A lookup by server key — a key the console has no words for yet reads as undefined. */
export type CopyMap<T> = Partial<Record<string, T>>;

export interface TitledCopy {
  title: string;
  hint: string;
}

export interface LeaderboardCopy extends TitledCopy {
  /** The name column's heading. */
  name: string;
  /** What the table says with nothing to rank; the pod pages' own line when left out. */
  empty?: string;
}

export const KPI_COPY: CopyMap<TitledCopy> = {
  store_revenue: { title: 'analytics.kpi.storeRevenue', hint: 'analytics.kpi.storeRevenueHint' },
  store_orders: { title: 'analytics.kpi.storeOrders', hint: 'analytics.kpi.storeOrdersHint' },
  store_aov: { title: 'analytics.kpi.storeAov', hint: 'analytics.kpi.storeAovHint' },
  store_units: { title: 'analytics.kpi.storeUnits', hint: 'analytics.kpi.storeUnitsHint' },
  store_customers: { title: 'analytics.kpi.storeCustomers', hint: 'analytics.kpi.storeCustomersHint' },
  store_new_customers: { title: 'analytics.kpi.storeNewCustomers', hint: 'analytics.kpi.storeNewCustomersHint' },
  store_returning_rate: { title: 'analytics.kpi.storeReturningRate', hint: 'analytics.kpi.storeReturningRateHint' },
  store_cancel_rate: { title: 'analytics.kpi.storeCancelRate', hint: 'analytics.kpi.storeCancelRateHint' },
  store_return_rate: { title: 'analytics.kpi.storeReturnRate', hint: 'analytics.kpi.storeReturnRateHint' },
  store_cod_share: { title: 'analytics.kpi.storeCodShare', hint: 'analytics.kpi.storeCodShareHint' },
  store_guest_share: { title: 'analytics.kpi.storeGuestShare', hint: 'analytics.kpi.storeGuestShareHint' },
  store_abandoned_carts: { title: 'analytics.kpi.storeAbandonedCarts', hint: 'analytics.kpi.storeAbandonedCartsHint' },
  store_listed_products: { title: 'analytics.kpi.storeListedProducts', hint: 'analytics.kpi.storeListedProductsHint' },
  store_active_subscriptions: { title: 'analytics.kpi.storeActiveSubscriptions', hint: 'analytics.kpi.storeActiveSubscriptionsHint' },
  users_total: { title: 'analytics.kpi.usersTotal', hint: 'analytics.kpi.usersTotalHint' },
  new_signups: { title: 'analytics.kpi.newSignups', hint: 'analytics.kpi.newSignupsHint' },
  active_users: { title: 'analytics.kpi.activeUsers', hint: 'analytics.kpi.activeUsersHint' },
  active_devices: { title: 'analytics.kpi.activeDevices', hint: 'analytics.kpi.activeDevicesHint' },
  avg_daily_active: { title: 'analytics.kpi.avgDailyActive', hint: 'analytics.kpi.avgDailyActiveHint' },
  stickiness: { title: 'analytics.kpi.stickiness', hint: 'analytics.kpi.stickinessHint' },
  retention_rate: { title: 'analytics.kpi.retentionRate', hint: 'analytics.kpi.retentionRateHint' },
  booking_users: { title: 'analytics.kpi.bookingUsers', hint: 'analytics.kpi.bookingUsersHint' },
  booking_conversion: { title: 'analytics.kpi.bookingConversion', hint: 'analytics.kpi.bookingConversionHint' },
  new_user_activation: { title: 'analytics.kpi.newUserActivation', hint: 'analytics.kpi.newUserActivationHint' },
  phone_verified_share: { title: 'analytics.kpi.phoneVerifiedShare', hint: 'analytics.kpi.phoneVerifiedShareHint' },
  inactive_accounts: { title: 'analytics.kpi.inactiveAccounts', hint: 'analytics.kpi.inactiveAccountsHint' },
  pods_held: { title: 'analytics.kpi.podsHeld', hint: 'analytics.kpi.podsHeldHint' },
  pods_created: { title: 'analytics.kpi.podsCreated', hint: 'analytics.kpi.podsCreatedHint' },
  seats_booked: { title: 'analytics.kpi.seatsBooked', hint: 'analytics.kpi.seatsBookedHint' },
  unique_guests: { title: 'analytics.kpi.uniqueGuests', hint: 'analytics.kpi.uniqueGuestsHint' },
  repeat_guest_rate: { title: 'analytics.kpi.repeatGuestRate', hint: 'analytics.kpi.repeatGuestRateHint' },
  fill_rate: { title: 'analytics.kpi.fillRate', hint: 'analytics.kpi.fillRateHint' },
  attendance_rate: { title: 'analytics.kpi.attendanceRate', hint: 'analytics.kpi.attendanceRateHint' },
  revenue: { title: 'analytics.kpi.revenue', hint: 'analytics.kpi.revenueHint' },
  avg_booking_value: { title: 'analytics.kpi.avgBookingValue', hint: 'analytics.kpi.avgBookingValueHint' },
  cancellation_rate: { title: 'analytics.kpi.cancellationRate', hint: 'analytics.kpi.cancellationRateHint' },
  backout_rate: { title: 'analytics.kpi.backoutRate', hint: 'analytics.kpi.backoutRateHint' },
  avg_rating: { title: 'analytics.kpi.avgRating', hint: 'analytics.kpi.avgRatingHint' },
  clubs_total: { title: 'analytics.kpi.clubsTotal', hint: 'analytics.kpi.clubsTotalHint' },
  new_clubs: { title: 'analytics.kpi.newClubs', hint: 'analytics.kpi.newClubsHint' },
  active_clubs: { title: 'analytics.kpi.activeClubs', hint: 'analytics.kpi.activeClubsHint' },
  club_activity_rate: { title: 'analytics.kpi.clubActivityRate', hint: 'analytics.kpi.clubActivityRateHint' },
  dormant_clubs: { title: 'analytics.kpi.dormantClubs', hint: 'analytics.kpi.dormantClubsHint' },
  pods_per_active_club: { title: 'analytics.kpi.podsPerActiveClub', hint: 'analytics.kpi.podsPerActiveClubHint' },
  seats_per_active_club: { title: 'analytics.kpi.seatsPerActiveClub', hint: 'analytics.kpi.seatsPerActiveClubHint' },
  verified_share: { title: 'analytics.kpi.verifiedShare', hint: 'analytics.kpi.verifiedShareHint' },
  clubs_without_admin: { title: 'analytics.kpi.clubsWithoutAdmin', hint: 'analytics.kpi.clubsWithoutAdminHint' },
  inactive_clubs: { title: 'analytics.kpi.inactiveClubs', hint: 'analytics.kpi.inactiveClubsHint' },
  club_ratings: { title: 'analytics.kpi.clubRatings', hint: 'analytics.kpi.clubRatingsHint' },
  avg_club_rating: { title: 'analytics.kpi.avgClubRating', hint: 'analytics.kpi.avgClubRatingHint' },
  admins_total: { title: 'analytics.kpi.adminsTotal', hint: 'analytics.kpi.adminsTotalHint' },
  pending_review: { title: 'analytics.kpi.pendingReview', hint: 'analytics.kpi.pendingReviewHint' },
  new_applications: { title: 'analytics.kpi.newApplications', hint: 'analytics.kpi.newApplicationsHint' },
  approvals: { title: 'analytics.kpi.approvals', hint: 'analytics.kpi.approvalsHint' },
  avg_review_days: { title: 'analytics.kpi.avgReviewDays', hint: 'analytics.kpi.avgReviewDaysHint' },
  active_admins: { title: 'analytics.kpi.activeAdmins', hint: 'analytics.kpi.activeAdminsHint' },
  admin_activation_rate: { title: 'analytics.kpi.adminActivationRate', hint: 'analytics.kpi.adminActivationRateHint' },
  club_coverage: { title: 'analytics.kpi.clubCoverage', hint: 'analytics.kpi.clubCoverageHint' },
  clubs_per_admin: { title: 'analytics.kpi.clubsPerAdmin', hint: 'analytics.kpi.clubsPerAdminHint' },
  admins_without_clubs: { title: 'analytics.kpi.adminsWithoutClubs', hint: 'analytics.kpi.adminsWithoutClubsHint' },
  forced_marks: { title: 'analytics.kpi.forcedMarks', hint: 'analytics.kpi.forcedMarksHint' },
  admin_rating: { title: 'analytics.kpi.adminRating', hint: 'analytics.kpi.adminRatingHint' },
  hosts_total: { title: 'analytics.kpi.hostsTotal', hint: 'analytics.kpi.hostsTotalHint' },
  approved_hosts: { title: 'analytics.kpi.approvedHosts', hint: 'analytics.kpi.approvedHostsHint' },
  approval_rate: { title: 'analytics.kpi.approvalRate', hint: 'analytics.kpi.approvalRateHint' },
  active_hosts: { title: 'analytics.kpi.activeHosts', hint: 'analytics.kpi.activeHostsHint' },
  host_activation_rate: { title: 'analytics.kpi.hostActivationRate', hint: 'analytics.kpi.hostActivationRateHint' },
  pods_per_active_host: { title: 'analytics.kpi.podsPerActiveHost', hint: 'analytics.kpi.podsPerActiveHostHint' },
  scan_share: { title: 'analytics.kpi.scanShare', hint: 'analytics.kpi.scanShareHint' },
  host_rating: { title: 'analytics.kpi.hostRating', hint: 'analytics.kpi.hostRatingHint' },
  ...PLATFORM_COPY.kpis,
};

export const TREND_COPY: CopyMap<TitledCopy> = {
  store_revenue: { title: 'analytics.trend.storeRevenue', hint: 'analytics.trend.storeRevenueHint' },
  store_orders: { title: 'analytics.trend.storeOrders', hint: 'analytics.trend.storeOrdersHint' },
  store_customers: { title: 'analytics.trend.storeCustomers', hint: 'analytics.trend.storeCustomersHint' },
  user_activity: { title: 'analytics.trend.userActivity', hint: 'analytics.trend.userActivityHint' },
  signups: { title: 'analytics.trend.signups', hint: 'analytics.trend.signupsHint' },
  accounts_total: { title: 'analytics.trend.accountsTotal', hint: 'analytics.trend.accountsTotalHint' },
  pods: { title: 'analytics.trend.pods', hint: 'analytics.trend.podsHint' },
  bookings: { title: 'analytics.trend.bookings', hint: 'analytics.trend.bookingsHint' },
  revenue: { title: 'analytics.trend.revenue', hint: 'analytics.trend.revenueHint' },
  clubs: { title: 'analytics.trend.clubs', hint: 'analytics.trend.clubsHint' },
  club_total: { title: 'analytics.trend.clubTotal', hint: 'analytics.trend.clubTotalHint' },
  admin_onboarding: { title: 'analytics.trend.adminOnboarding', hint: 'analytics.trend.adminOnboardingHint' },
  admin_activity: { title: 'analytics.trend.adminActivity', hint: 'analytics.trend.adminActivityHint' },
  host_onboarding: { title: 'analytics.trend.hostOnboarding', hint: 'analytics.trend.hostOnboardingHint' },
  host_activity: { title: 'analytics.trend.hostActivity', hint: 'analytics.trend.hostActivityHint' },
  ...PLATFORM_COPY.trends,
};

/** A series reads like the tile it shares a key with; these have no tile. */
export const SERIES_COPY: CopyMap<string> = {
  store_cancelled: 'analytics.series.storeCancelled',
  store_orders_returning: 'analytics.series.storeOrdersReturning',
  accounts_total: 'analytics.series.accountsTotal',
  pods_cancelled: 'analytics.series.podsCancelled',
  backouts: 'analytics.series.backouts',
  rejections: 'analytics.series.rejections',
  ...PLATFORM_COPY.series,
};

export const GRANULARITY_COPY: Record<AnalyticsGranularity, string> = {
  DAY: 'analytics.trend.perDay',
  WEEK: 'analytics.trend.perWeek',
  MONTH: 'analytics.trend.perMonth',
};

export const BREAKDOWN_COPY: CopyMap<string> = {
  store_orders_by_status: 'analytics.breakdown.storeOrdersByStatus',
  store_payment_method: 'analytics.breakdown.storePaymentMethod',
  store_buyer_type: 'analytics.breakdown.storeBuyerType',
  store_revenue_by_pet: 'analytics.breakdown.storeRevenueByPet',
  store_revenue_by_category: 'analytics.breakdown.storeRevenueByCategory',
  store_revenue_by_brand: 'analytics.breakdown.storeRevenueByBrand',
  store_orders_by_city: 'analytics.breakdown.storeOrdersByCity',
  store_basket_value: 'analytics.breakdown.storeBasketValue',
  store_order_hour: 'analytics.breakdown.storeOrderHour',
  activity_frequency: 'analytics.breakdown.activityFrequency',
  top_screens: 'analytics.breakdown.topScreens',
  users_by_city: 'analytics.breakdown.usersByCity',
  user_age: 'analytics.breakdown.userAge',
  user_gender: 'analytics.breakdown.userGender',
  pet_owners: 'analytics.breakdown.petOwners',
  user_language: 'analytics.breakdown.userLanguage',
  sign_in_method: 'analytics.breakdown.signInMethod',
  pods_by_category: 'analytics.breakdown.podsByCategory',
  pods_by_city: 'analytics.breakdown.podsByCity',
  weekday: 'analytics.breakdown.weekday',
  hour_of_day: 'analytics.breakdown.hourOfDay',
  fill_band: 'analytics.breakdown.fillBand',
  price_band: 'analytics.breakdown.priceBand',
  pod_format: 'analytics.breakdown.podFormat',
  lead_time: 'analytics.breakdown.leadTime',
  booking_source: 'analytics.breakdown.bookingSource',
  attendance_method: 'analytics.breakdown.attendanceMethod',
  pod_rating_stars: 'analytics.breakdown.podRatingStars',
  clubs_by_category: 'analytics.breakdown.clubsByCategory',
  clubs_by_city: 'analytics.breakdown.clubsByCity',
  pods_per_club: 'analytics.breakdown.podsPerClub',
  admins_per_club: 'analytics.breakdown.adminsPerClub',
  club_status: 'analytics.breakdown.clubStatus',
  club_rating_stars: 'analytics.breakdown.clubRatingStars',
  admin_status: 'analytics.breakdown.adminStatus',
  clubs_per_admin: 'analytics.breakdown.clubsPerAdmin',
  admins_by_category: 'analytics.breakdown.adminsByCategory',
  admins_by_city: 'analytics.breakdown.adminsByCity',
  admin_rating_stars: 'analytics.breakdown.adminRatingStars',
  host_status: 'analytics.breakdown.hostStatus',
  pods_per_host: 'analytics.breakdown.podsPerHost',
  hosts_by_category: 'analytics.breakdown.hostsByCategory',
  hosts_by_city: 'analytics.breakdown.hostsByCity',
  host_marks: 'analytics.breakdown.hostMarks',
  host_rating_stars: 'analytics.breakdown.hostRatingStars',
  ...PLATFORM_COPY.breakdowns,
};

export const LEADERBOARD_COPY: CopyMap<LeaderboardCopy> = {
  top_store_products: {
    title: 'analytics.leaderboard.topStoreProducts',
    hint: 'analytics.leaderboard.topStoreProductsHint',
    name: 'analytics.leaderboard.storeProduct',
  },
  top_clubs: {
    title: 'analytics.leaderboard.topClubs',
    hint: 'analytics.leaderboard.topClubsHint',
    name: 'analytics.leaderboard.club',
  },
  top_club_admins: {
    title: 'analytics.leaderboard.topClubAdmins',
    hint: 'analytics.leaderboard.topClubAdminsHint',
    name: 'analytics.leaderboard.clubAdmin',
  },
  top_hosts: {
    title: 'analytics.leaderboard.topHosts',
    hint: 'analytics.leaderboard.topHostsHint',
    name: 'analytics.leaderboard.host',
  },
  ...PLATFORM_COPY.leaderboards,
};

export const COLUMN_COPY: CopyMap<string> = {
  units: 'analytics.leaderboard.units',
  clubs: 'analytics.leaderboard.clubs',
  pods_held: 'analytics.leaderboard.podsHeld',
  seats_filled: 'analytics.leaderboard.seatsFilled',
  fill_rate: 'analytics.leaderboard.fillRate',
  revenue: 'analytics.leaderboard.revenue',
  attendance_rate: 'analytics.leaderboard.attendanceRate',
  avg_rating: 'analytics.leaderboard.avgRating',
  forced_marks: 'analytics.leaderboard.forcedMarks',
  admin_rating: 'analytics.leaderboard.adminRating',
  ...PLATFORM_COPY.columns,
};
