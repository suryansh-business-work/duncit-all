import type { PageCopy } from './types';

/**
 * Growth > Contacts, also Marketing > Contacts. Members are named by the data;
 * nobody from a phone book is ever named, so every other word is here.
 */
export const CONTACTS_COPY: PageCopy = {
  kpis: {
    ctc_syncing_members: { title: 'analytics.kpi.ctcSyncingMembers', hint: 'analytics.kpi.ctcSyncingMembersHint' },
    ctc_synced_contacts: { title: 'analytics.kpi.ctcSyncedContacts', hint: 'analytics.kpi.ctcSyncedContactsHint' },
    ctc_matched_contacts: { title: 'analytics.kpi.ctcMatchedContacts', hint: 'analytics.kpi.ctcMatchedContactsHint' },
    ctc_match_rate: { title: 'analytics.kpi.ctcMatchRate', hint: 'analytics.kpi.ctcMatchRateHint' },
    ctc_recent_syncs: { title: 'analytics.kpi.ctcRecentSyncs', hint: 'analytics.kpi.ctcRecentSyncsHint' },
    ctc_new_connections: { title: 'analytics.kpi.ctcNewConnections', hint: 'analytics.kpi.ctcNewConnectionsHint' },
    ctc_invites_sent: { title: 'analytics.kpi.ctcInvitesSent', hint: 'analytics.kpi.ctcInvitesSentHint' },
    ctc_invites_failed: { title: 'analytics.kpi.ctcInvitesFailed', hint: 'analytics.kpi.ctcInvitesFailedHint' },
    ctc_inviters: { title: 'analytics.kpi.ctcInviters', hint: 'analytics.kpi.ctcInvitersHint' },
    ctc_invites_joined: { title: 'analytics.kpi.ctcInvitesJoined', hint: 'analytics.kpi.ctcInvitesJoinedHint' },
    ctc_invite_conversion: { title: 'analytics.kpi.ctcInviteConversion', hint: 'analytics.kpi.ctcInviteConversionHint' },
    ctc_invite_cost: { title: 'analytics.kpi.ctcInviteCost', hint: 'analytics.kpi.ctcInviteCostHint' },
  },
  trends: {
    ctc_syncs: { title: 'analytics.trend.ctcSyncs', hint: 'analytics.trend.ctcSyncsHint' },
    ctc_invites: { title: 'analytics.trend.ctcInvites', hint: 'analytics.trend.ctcInvitesHint' },
  },
  series: {},
  breakdowns: {
    ctc_invite_outcomes: 'analytics.breakdown.ctcInviteOutcomes',
    ctc_phone_book_size: 'analytics.breakdown.ctcPhoneBookSize',
    ctc_found_per_member: 'analytics.breakdown.ctcFoundPerMember',
  },
  slices: {
    ctc_invite_outcomes: {
      SENT: 'analytics.slice.logSent',
      FAILED: 'analytics.slice.logFailed',
      SKIPPED: 'analytics.slice.logSkipped',
    },
    ctc_phone_book_size: {
      book_0: 'analytics.slice.ctcBook0',
      book_1_49: 'analytics.slice.ctcBook1To49',
      book_50_199: 'analytics.slice.ctcBook50To199',
      book_200_499: 'analytics.slice.ctcBook200To499',
      book_500_999: 'analytics.slice.ctcBook500To999',
      book_1000_plus: 'analytics.slice.ctcBook1000Plus',
    },
    ctc_found_per_member: {
      found_0: 'analytics.slice.ctcFound0',
      found_1_4: 'analytics.slice.ctcFound1To4',
      found_5_19: 'analytics.slice.ctcFound5To19',
      found_20_49: 'analytics.slice.ctcFound20To49',
      found_50_plus: 'analytics.slice.ctcFound50Plus',
    },
  },
  leaderboards: {
    ctc_top_members: {
      title: 'analytics.leaderboard.ctcTopMembers',
      hint: 'analytics.leaderboard.ctcTopMembersHint',
      name: 'analytics.leaderboard.ctcMember',
      empty: 'analytics.page.noData',
    },
  },
  columns: {
    ctc_invites_sent: 'analytics.leaderboard.ctcInvitesSent',
    ctc_invites_joined: 'analytics.leaderboard.ctcInvitesJoined',
    ctc_synced_contacts: 'analytics.leaderboard.ctcSyncedContacts',
    ctc_matched_contacts: 'analytics.leaderboard.ctcMatchedContacts',
    ctc_days_since_sync: 'analytics.leaderboard.ctcDaysSinceSync',
  },
};
