import type { NestedCatalogue } from '../catalogue';

/**
 * The Ads Portal's own copy — the advertiser's side: their dashboard, their
 * requests, and one request's detail.
 *
 * The ad's OWN content (its title, description, redirect URL, target audience)
 * is never here: an advertiser wrote those, and keying them would mean the
 * console showed something other than what was submitted for review.
 */
export const ADS_BUNDLE: NestedCatalogue = {
  ads: {
    // Dashboard KPI tiles.
    stats: {
      total: 'Total Ads',
      pending: 'Pending Review',
      live: 'Live Now',
      approved: 'Upcoming Approved',
      rejected: 'Rejected',
      expired: 'Expired',
      totalApprovedCost: 'Total Approved Spend',
      liveSpend: 'Live Spend',
    },

    myAds: {
      title: 'My Ads',
      subtitle: 'Track your ad requests — quotes, review status and live placements.',
      create: 'New Ad',
      empty: 'No ad requests yet — create your first ad',
      search: 'Search trace ID or title',
      recentSearch: 'Search recent requests',
      colTraceId: 'Trace ID',
      colTitle: 'Title',
      colPosition: 'Position',
      colType: 'Type',
      colStarts: 'Starts',
      colDays: 'Days',
      colEstimatedCost: 'Est. Cost',
      colStatus: 'Status',
      colSubmitted: 'Submitted',
    },

    create: {
      title: 'Create Ad',
      subtitle: 'Submit an ad request — the Marketing team reviews it and confirms the final cost.',
      submitFailed: 'Ad request could not be submitted',
      submitted: 'Ad request submitted · Trace ID {traceId}',
    },

    detail: {
      title: 'Request Details',
      description: 'Description',
      position: 'Position',
      starts: 'Starts',
      ends: 'Ends',
      duration: 'Duration',
      // Count-driven copy: the translator picks .one or .other from `count`,
      // so a language with different plural rules edits plain rows like these.
      durationDays: {
        one: '{count} day',
        other: '{count} days',
      },
      redirectUrl: 'Redirect URL',
      targetAudience: 'Target audience',
      submittedBy: 'Submitted by',
      submittedOn: 'Submitted on',
      estimatedCost: 'Estimated cost',
      approvedCost: 'Approved cost',
      approvedCostPending: 'Pending review',
    },
  },
};
