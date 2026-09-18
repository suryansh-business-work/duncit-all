import type { PageCopy } from './types';

/** Business > Venues. */
export const VENUES_COPY: PageCopy = {
  kpis: {
    ven_total: { title: 'analytics.kpi.venTotal', hint: 'analytics.kpi.venTotalHint' },
    ven_verified: { title: 'analytics.kpi.venVerified', hint: 'analytics.kpi.venVerifiedHint' },
    ven_new: { title: 'analytics.kpi.venNew', hint: 'analytics.kpi.venNewHint' },
    ven_active: { title: 'analytics.kpi.venActive', hint: 'analytics.kpi.venActiveHint' },
    ven_slot_requests: { title: 'analytics.kpi.venSlotRequests', hint: 'analytics.kpi.venSlotRequestsHint' },
    ven_pending_requests: { title: 'analytics.kpi.venPendingRequests', hint: 'analytics.kpi.venPendingRequestsHint' },
    ven_approval_rate: { title: 'analytics.kpi.venApprovalRate', hint: 'analytics.kpi.venApprovalRateHint' },
    ven_requests_expired: { title: 'analytics.kpi.venRequestsExpired', hint: 'analytics.kpi.venRequestsExpiredHint' },
    ven_decision_time: { title: 'analytics.kpi.venDecisionTime', hint: 'analytics.kpi.venDecisionTimeHint' },
    ven_pods_held: { title: 'analytics.kpi.venPodsHeld', hint: 'analytics.kpi.venPodsHeldHint' },
    ven_fill_rate: { title: 'analytics.kpi.venFillRate', hint: 'analytics.kpi.venFillRateHint' },
    ven_cancellations: { title: 'analytics.kpi.venCancellations', hint: 'analytics.kpi.venCancellationsHint' },
  },
  trends: {
    ven_requests: { title: 'analytics.trend.venRequests', hint: 'analytics.trend.venRequestsHint' },
    ven_pods: { title: 'analytics.trend.venPods', hint: 'analytics.trend.venPodsHint' },
    ven_growth: { title: 'analytics.trend.venGrowth', hint: 'analytics.trend.venGrowthHint' },
  },
  series: {
    ven_approved: 'analytics.series.venApproved',
    ven_declined: 'analytics.series.venDeclined',
  },
  breakdowns: {
    ven_by_status: 'analytics.breakdown.venByStatus',
    ven_by_city: 'analytics.breakdown.venByCity',
    ven_by_category: 'analytics.breakdown.venByCategory',
    ven_request_outcomes: 'analytics.breakdown.venRequestOutcomes',
    ven_upcoming_slots: 'analytics.breakdown.venUpcomingSlots',
  },
  slices: {
    ven_by_status: {
      DRAFT: 'analytics.slice.venDraft',
      SUBMITTED: 'analytics.slice.venSubmitted',
      APPROVED: 'analytics.slice.venApproved',
      REJECTED: 'analytics.slice.venRejected',
    },
    ven_request_outcomes: {
      APPROVED: 'analytics.slice.venOutcomeApproved',
      DECLINED: 'analytics.slice.venOutcomeDeclined',
      EXPIRED: 'analytics.slice.venOutcomeExpired',
    },
    ven_upcoming_slots: {
      AVAILABLE: 'analytics.slice.venSlotAvailable',
      PENDING: 'analytics.slice.venSlotPending',
      BOOKED: 'analytics.slice.venSlotBooked',
      BLOCKED: 'analytics.slice.venSlotBlocked',
    },
  },
  leaderboards: {
    ven_top_venues: {
      title: 'analytics.leaderboard.venTopVenues',
      hint: 'analytics.leaderboard.venTopVenuesHint',
      name: 'analytics.leaderboard.venVenue',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    ven_pods_held: 'analytics.leaderboard.venPodsHeld',
    ven_seats_filled: 'analytics.leaderboard.venSeatsFilled',
    ven_fill_rate: 'analytics.leaderboard.venFillRate',
    ven_revenue: 'analytics.leaderboard.venRevenue',
    ven_attendance_rate: 'analytics.leaderboard.venAttendanceRate',
    ven_avg_rating: 'analytics.leaderboard.venAvgRating',
  },
};
