import type { NestedCatalogue } from '../catalogue';

/**
 * Club Admin copy — the dashboard figures, the pod status vocabulary, the
 * AI-monitored audit trail and the words around a club admin's pods — as a
 * namespace of its own, not a surface's.
 *
 * The Partners console rendered these under `partners.clubAdmin*`, which mWeb
 * and the native app do not ship. The same figures and the same status chips
 * now render on all three surfaces (rule 27), so the copy lives once, in a
 * bundle every surface spreads into its fallback (rules 38 + 40). The rules
 * that decide which label applies live in `@duncit/utils`; only the words
 * are here.
 */
export const CLUB_ADMIN_BUNDLE: NestedCatalogue = {
  clubAdmin: {
    /**
     * The Status chip on every partner pods table AND the pods page's status
     * filter read these — one set of words, so a pod can never be filtered
     * under one name and labelled with another.
     */
    podStatus: {
      all: 'All statuses',
      active: 'Active',
      draft: 'Draft',
      awaitingVenue: 'Awaiting venue',
      venueRejected: 'Venue rejected',
      completed: 'Completed',
      cancelled: 'Cancelled',
    },
    /** The AI-monitored audit trail: what happened, who did it, how risky. */
    audit: {
      action: {
        create: 'Created',
        update: 'Edited',
        resubmit: 'Resubmitted',
        delete: 'Deleted',
        venueApproved: 'Venue Approved',
        venueDeclined: 'Venue Rejected',
        complete: 'Completed',
        rejected: 'Content Blocked',
      },
      source: {
        admin: 'Admin Portal',
        clubAdmin: 'Club Admin',
        host: 'Host',
        venueOwner: 'Venue Owner',
        system: 'System',
      },
      risk: {
        pending: 'PENDING',
        low: 'LOW',
        medium: 'MEDIUM',
        high: 'HIGH',
      },
    },
    dashboard: {
      eyebrow: 'Partner tools · Club Admin',
      title: 'Club Admin Dashboard',
      subtitle: 'Pods, bookings, community and revenue across every club you administer.',
      range: 'Range',
      perClubBreakdown: 'Per-club breakdown',
      searchClubs: 'Search club name or slug',
      monthlyTrend: 'Monthly trend',
      monthlyTrendChart: 'Monthly trend chart',
      trendEmpty: 'Not enough data to draw a trend yet.',
      yourCategories: 'Your Categories',
      yourCategoriesHint: 'The categories your clubs run under.',
      categoriesEmpty: 'No category is set on your clubs yet.',
      clubs: 'Clubs',
      pods: 'Pods',
      noClubs: 'No clubs are assigned to you yet.',
      group: {
        overview: 'Overview',
        engagement: 'Engagement',
        community: 'Community',
        revenue: 'Revenue',
      },
      ranges: {
        last30Days: 'Last 30 days',
        thisMonth: 'This month',
        last12Months: 'Last 12 months',
        allTime: 'All time',
      },
      series: {
        pods: 'Pods',
        bookings: 'Bookings',
        followers: 'Followers',
        revenue: 'Revenue',
      },
      card: {
        assignedClubs: 'Assigned Clubs',
        totalPods: 'Total Pods',
        upcomingPods: 'Upcoming Pods',
        completedPods: 'Completed Pods',
        totalBookings: 'Total Bookings',
        totalAttendees: 'Total Attendees',
        fillRate: 'Fill Rate',
        backedOut: 'Backed Out',
        totalFollowers: 'Total Followers',
        newFollowers: 'New Followers',
        avgRating: 'Avg Rating',
        activeHosts: 'Active Hosts',
        totalRevenue: 'Total Revenue',
        totalSpots: 'Total Spots',
      },
      hint: {
        assignedClubs: 'Clubs you administer',
        totalPods: 'Pods across your clubs',
        upcomingPods: 'Scheduled from today',
        completedPods: 'Pods already wrapped up',
        totalBookings: 'Confirmed joins',
        totalAttendees: 'People across all pods',
        fillRate: 'Attendees vs spots',
        backedOut: 'Cancelled memberships',
        totalFollowers: 'Across your clubs',
        newFollowers: 'Within the selected range',
        avgRating: 'Average of user ratings',
        activeHosts: 'Distinct hosts running pods',
        totalRevenue: 'Collected from successful payments',
        totalSpots: 'Capacity across all pods',
      },
      column: {
        totalPods: 'Total pods',
        rating: 'Rating',
        revenue: 'Revenue',
      },
    },
    clubs: {
      yourClubs: 'Your Clubs',
      subtitle: 'Clubs you administer. Click a club to open its details, or jump straight to its pods.',
      pods: 'Pods',
      upcoming: 'Upcoming',
      followers: 'Followers',
      verified: 'Verified',
      unverified: 'Unverified',
      editClub: 'Edit Club Details',
      noClubs: 'No clubs are assigned to you yet.',
      search: 'Search clubs',
    },
    pods: {
      title: 'Club Admin · Pods',
      clubPods: 'Club pods',
      createEditDelete: 'Create, edit and delete pods for this club.',
      newPod: 'New Pod',
      editPod: 'Edit pod',
      deletePod: 'Delete pod',
      deletePodConfirmTitle: 'Delete pod?',
      deletePodConfirmBody:
        'This will remove {title} from the club. Members lose access to it. This cannot be undone.',
      podDeleted: 'Pod deleted.',
      podDetails: 'Pod details',
      podAttendance: 'Pod Attendance',
      aiMonitoring: 'AI Monitoring',
      activity: 'Activity · {title}',
      aiSummary: 'AI: {summary}',
      noActivity: 'No recorded activity for this pod yet.',
      noPods: 'This club has no pods yet. Create the first one.',
      statusFilter: 'Status',
    },
    monitoring: {
      title: 'Pod Monitoring (AI)',
      subtitle: 'Every pod edit, status change and critical action in your clubs — risk-scored by AI.',
      search: 'Search pod, actor or AI summary',
      when: 'When',
      actor: 'By',
      unknownActor: 'Unknown actor',
      changes: 'Changes',
      changesCount: 'Changes ({total})',
      noChanges: 'No tracked field changed for this action.',
      emptyValue: '(empty)',
      note: 'Note:',
      aiRisk: 'AI Risk',
      aiRiskChip: 'AI risk: {risk}',
      aiSummary: 'AI Summary',
      noActivity: 'No pod activity recorded yet.',
    },
    editClub: {
      title: 'Edit Club Details',
      eyebrow: 'Club Admin · Edit',
      backToPods: 'Back to pods',
      saved: 'Club details updated.',
      notFound: 'Club not found.',
      addImage: 'Add club image',
    },
    editor: {
      eyebrow: 'Club Admin · {club}',
      hostNote: 'You are added as the pod host automatically unless you assign hosts below.',
      backLabel: 'Back to pods',
      podCreated: 'Pod created.',
      draftSaved: 'Pod draft saved.',
      podUpdated: 'Pod updated.',
      notFound: 'Pod not found in this club.',
    },
  },
};
