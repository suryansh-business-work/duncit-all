import type { PageCopy } from './types';

/** Operations > Support. */
export const SUPPORT_COPY: PageCopy = {
  kpis: {
    sup_tickets_opened: { title: 'analytics.kpi.supTicketsOpened', hint: 'analytics.kpi.supTicketsOpenedHint' },
    sup_tickets_resolved: { title: 'analytics.kpi.supTicketsResolved', hint: 'analytics.kpi.supTicketsResolvedHint' },
    sup_backlog: { title: 'analytics.kpi.supBacklog', hint: 'analytics.kpi.supBacklogHint' },
    sup_first_reply: { title: 'analytics.kpi.supFirstReply', hint: 'analytics.kpi.supFirstReplyHint' },
    sup_resolve_time: { title: 'analytics.kpi.supResolveTime', hint: 'analytics.kpi.supResolveTimeHint' },
    sup_reopened: { title: 'analytics.kpi.supReopened', hint: 'analytics.kpi.supReopenedHint' },
    sup_csat: { title: 'analytics.kpi.supCsat', hint: 'analytics.kpi.supCsatHint' },
    sup_chats_started: { title: 'analytics.kpi.supChatsStarted', hint: 'analytics.kpi.supChatsStartedHint' },
    sup_chats_answered: { title: 'analytics.kpi.supChatsAnswered', hint: 'analytics.kpi.supChatsAnsweredHint' },
    sup_callbacks: { title: 'analytics.kpi.supCallbacks', hint: 'analytics.kpi.supCallbacksHint' },
    sup_sos_alerts: { title: 'analytics.kpi.supSosAlerts', hint: 'analytics.kpi.supSosAlertsHint' },
    sup_problems_reported: {
      title: 'analytics.kpi.supProblemsReported',
      hint: 'analytics.kpi.supProblemsReportedHint',
    },
  },
  trends: {
    sup_tickets: { title: 'analytics.trend.supTickets', hint: 'analytics.trend.supTicketsHint' },
    sup_response_times: { title: 'analytics.trend.supResponseTimes', hint: 'analytics.trend.supResponseTimesHint' },
    sup_contacts: { title: 'analytics.trend.supContacts', hint: 'analytics.trend.supContactsHint' },
  },
  series: {},
  breakdowns: {
    sup_by_category: 'analytics.breakdown.supByCategory',
    sup_by_channel: 'analytics.breakdown.supByChannel',
    sup_by_priority: 'analytics.breakdown.supByPriority',
    sup_by_status: 'analytics.breakdown.supByStatus',
    sup_problem_categories: 'analytics.breakdown.supProblemCategories',
    sup_rating_stars: 'analytics.breakdown.supRatingStars',
  },
  slices: {
    sup_by_category: {
      GENERAL: 'analytics.slice.supGeneral',
      PAYMENT: 'analytics.slice.supPayment',
      BOOKING: 'analytics.slice.supBooking',
      SAFETY: 'analytics.slice.supSafety',
      TECHNICAL: 'analytics.slice.supTechnical',
      OTHER: 'analytics.slice.supOther',
    },
    sup_by_channel: {
      APP: 'analytics.slice.supApp',
      WEBSITE: 'analytics.slice.supWebsite',
      EMAIL: 'analytics.slice.supEmail',
    },
    sup_by_priority: {
      HIGH: 'analytics.slice.supHigh',
      MEDIUM: 'analytics.slice.supMedium',
      LOW: 'analytics.slice.supLow',
    },
    sup_by_status: {
      OPEN: 'analytics.slice.supOpen',
      PENDING: 'analytics.slice.supPending',
      RESOLVED: 'analytics.slice.supResolved',
      CLOSED: 'analytics.slice.supClosed',
    },
    sup_rating_stars: {
      '1': 'analytics.slice.supStar1',
      '2': 'analytics.slice.supStar2',
      '3': 'analytics.slice.supStar3',
      '4': 'analytics.slice.supStar4',
      '5': 'analytics.slice.supStar5',
    },
  },
  leaderboards: {
    sup_agents: {
      title: 'analytics.leaderboard.supAgents',
      hint: 'analytics.leaderboard.supAgentsHint',
      name: 'analytics.leaderboard.supAgent',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    sup_tickets_handled: 'analytics.leaderboard.supTicketsHandled',
    sup_replies: 'analytics.leaderboard.supReplies',
    sup_chats_handled: 'analytics.leaderboard.supChatsHandled',
    sup_callbacks_made: 'analytics.leaderboard.supCallbacksMade',
    sup_sos_resolved: 'analytics.leaderboard.supSosResolved',
  },
};
