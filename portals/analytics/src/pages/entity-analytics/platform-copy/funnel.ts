import type { PageCopy } from './types';

/** Growth > Funnel & Retention. */
export const FUNNEL_COPY: PageCopy = {
  kpis: {
    fun_signups: { title: 'analytics.kpi.funSignups', hint: 'analytics.kpi.funSignupsHint' },
    fun_return_rate: { title: 'analytics.kpi.funReturnRate', hint: 'analytics.kpi.funReturnRateHint' },
    fun_bookers: { title: 'analytics.kpi.funBookers', hint: 'analytics.kpi.funBookersHint' },
    fun_first_booking_rate: { title: 'analytics.kpi.funFirstBookingRate', hint: 'analytics.kpi.funFirstBookingRateHint' },
    fun_repeat_rate: { title: 'analytics.kpi.funRepeatRate', hint: 'analytics.kpi.funRepeatRateHint' },
    fun_signup_to_repeat: { title: 'analytics.kpi.funSignupToRepeat', hint: 'analytics.kpi.funSignupToRepeatHint' },
    fun_days_to_first_booking: {
      title: 'analytics.kpi.funDaysToFirstBooking',
      hint: 'analytics.kpi.funDaysToFirstBookingHint',
    },
  },
  trends: {
    fun_cohort: { title: 'analytics.trend.funCohort', hint: 'analytics.trend.funCohortHint' },
    fun_conversion: { title: 'analytics.trend.funConversion', hint: 'analytics.trend.funConversionHint' },
  },
  series: {},
  breakdowns: {
    fun_steps: 'analytics.breakdown.funSteps',
    fun_days_to_book: 'analytics.breakdown.funDaysToBook',
    fun_bookings_per_member: 'analytics.breakdown.funBookingsPerMember',
  },
  slices: {
    fun_steps: {
      fun_signed_up: 'analytics.slice.funSignedUp',
      fun_came_back: 'analytics.slice.funCameBack',
      fun_booked_once: 'analytics.slice.funBookedOnce',
      fun_booked_twice: 'analytics.slice.funBookedTwice',
    },
    fun_days_to_book: {
      fun_same_day: 'analytics.slice.funSameDay',
      fun_1_2_days: 'analytics.slice.fun1To2Days',
      fun_3_7_days: 'analytics.slice.fun3To7Days',
      fun_8_30_days: 'analytics.slice.fun8To30Days',
      fun_31_plus_days: 'analytics.slice.fun31PlusDays',
    },
    fun_bookings_per_member: {
      fun_bookings_0: 'analytics.slice.funBookings0',
      fun_bookings_1: 'analytics.slice.funBookings1',
      fun_bookings_2_4: 'analytics.slice.funBookings2To4',
      fun_bookings_5_plus: 'analytics.slice.funBookings5Plus',
    },
  },
  leaderboards: {
    fun_cohorts: {
      title: 'analytics.leaderboard.funCohorts',
      hint: 'analytics.leaderboard.funCohortsHint',
      name: 'analytics.leaderboard.funCohortWeek',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    fun_cohort_size: 'analytics.leaderboard.funCohortSize',
    fun_week_1: 'analytics.leaderboard.funWeek1',
    fun_week_2: 'analytics.leaderboard.funWeek2',
    fun_week_4: 'analytics.leaderboard.funWeek4',
    fun_week_8: 'analytics.leaderboard.funWeek8',
    fun_cohort_booked: 'analytics.leaderboard.funCohortBooked',
  },
};
