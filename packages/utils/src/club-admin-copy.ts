import type {
  ClubAdminKpiCardKey,
  ClubAdminKpiGroupKey,
  ClubAdminRange,
  ClubAdminTrendKey,
} from './club-admin-dashboard';

/**
 * Every word the Club Admin surfaces render, assembled from the calling
 * surface's own translator.
 *
 * Each key is written out as a literal `t('clubAdmin.…')` rather than built
 * from a namespace + a suffix, because `scripts/verify-translation-keys.mjs`
 * greps source for the literal string — a composed key is reported as
 * shipped-but-never-rendered and fails the Shared Gates job. Same shape (and
 * same reason) as `pod-attendance-copy.ts`.
 *
 * `clubAdmin.*` is ONE namespace shipped by the shell, mWeb and native alike,
 * so unlike the attendance copy there is no per-surface twin of this file.
 */
export type ClubAdminTranslate = (
  key: string,
  options?: { vars?: Record<string, string | number> },
) => string;

/** A stat card's heading and the line under its figure. */
export interface ClubAdminKpiLabel {
  label: string;
  hint: string;
}

/** Label + hint for each of the fourteen dashboard cards, by `ClubAdminKpiCard.key`. */
export function clubAdminKpiLabels(t: ClubAdminTranslate): Record<ClubAdminKpiCardKey, ClubAdminKpiLabel> {
  return {
    assigned_clubs: {
      label: t('clubAdmin.dashboard.card.assignedClubs'),
      hint: t('clubAdmin.dashboard.hint.assignedClubs'),
    },
    total_pods: {
      label: t('clubAdmin.dashboard.card.totalPods'),
      hint: t('clubAdmin.dashboard.hint.totalPods'),
    },
    upcoming_pods: {
      label: t('clubAdmin.dashboard.card.upcomingPods'),
      hint: t('clubAdmin.dashboard.hint.upcomingPods'),
    },
    completed_pods: {
      label: t('clubAdmin.dashboard.card.completedPods'),
      hint: t('clubAdmin.dashboard.hint.completedPods'),
    },
    total_bookings: {
      label: t('clubAdmin.dashboard.card.totalBookings'),
      hint: t('clubAdmin.dashboard.hint.totalBookings'),
    },
    total_attendees: {
      label: t('clubAdmin.dashboard.card.totalAttendees'),
      hint: t('clubAdmin.dashboard.hint.totalAttendees'),
    },
    fill_rate: {
      label: t('clubAdmin.dashboard.card.fillRate'),
      hint: t('clubAdmin.dashboard.hint.fillRate'),
    },
    backed_out: {
      label: t('clubAdmin.dashboard.card.backedOut'),
      hint: t('clubAdmin.dashboard.hint.backedOut'),
    },
    total_followers: {
      label: t('clubAdmin.dashboard.card.totalFollowers'),
      hint: t('clubAdmin.dashboard.hint.totalFollowers'),
    },
    new_followers: {
      label: t('clubAdmin.dashboard.card.newFollowers'),
      hint: t('clubAdmin.dashboard.hint.newFollowers'),
    },
    avg_rating: {
      label: t('clubAdmin.dashboard.card.avgRating'),
      hint: t('clubAdmin.dashboard.hint.avgRating'),
    },
    active_hosts: {
      label: t('clubAdmin.dashboard.card.activeHosts'),
      hint: t('clubAdmin.dashboard.hint.activeHosts'),
    },
    total_revenue: {
      label: t('clubAdmin.dashboard.card.totalRevenue'),
      hint: t('clubAdmin.dashboard.hint.totalRevenue'),
    },
    total_spots: {
      label: t('clubAdmin.dashboard.card.totalSpots'),
      hint: t('clubAdmin.dashboard.hint.totalSpots'),
    },
  };
}

/** The heading over each card group, by `ClubAdminKpiGroup.key`. */
export function clubAdminGroupHeadings(t: ClubAdminTranslate): Record<ClubAdminKpiGroupKey, string> {
  return {
    overview: t('clubAdmin.dashboard.group.overview'),
    engagement: t('clubAdmin.dashboard.group.engagement'),
    community: t('clubAdmin.dashboard.group.community'),
    revenue: t('clubAdmin.dashboard.group.revenue'),
  };
}

/** The range select's rows, by `ClubAdminRange`. */
export function clubAdminRangeLabels(t: ClubAdminTranslate): Record<ClubAdminRange, string> {
  return {
    '30d': t('clubAdmin.dashboard.ranges.last30Days'),
    month: t('clubAdmin.dashboard.ranges.thisMonth'),
    '12m': t('clubAdmin.dashboard.ranges.last12Months'),
    all: t('clubAdmin.dashboard.ranges.allTime'),
  };
}

/** The trend chart's legend, by `ClubAdminTrendSeries.key`. */
export function clubAdminSeriesLabels(t: ClubAdminTranslate): Record<ClubAdminTrendKey, string> {
  return {
    pods: t('clubAdmin.dashboard.series.pods'),
    bookings: t('clubAdmin.dashboard.series.bookings'),
    followers: t('clubAdmin.dashboard.series.followers'),
    revenue: t('clubAdmin.dashboard.series.revenue'),
  };
}

/** The chrome of every Club Admin page — titles, hints, empty states, actions. */
export interface ClubAdminLabels {
  dashboard: {
    eyebrow: string;
    title: string;
    subtitle: string;
    range: string;
    perClubBreakdown: string;
    searchClubs: string;
    monthlyTrend: string;
    monthlyTrendChart: string;
    trendEmpty: string;
    yourCategories: string;
    yourCategoriesHint: string;
    categoriesEmpty: string;
    clubs: string;
    pods: string;
    noClubs: string;
    columnTotalPods: string;
    columnRating: string;
    columnRevenue: string;
  };
  clubs: {
    yourClubs: string;
    subtitle: string;
    pods: string;
    upcoming: string;
    followers: string;
    verified: string;
    unverified: string;
    editClub: string;
    noClubs: string;
    search: string;
  };
  pods: {
    title: string;
    clubPods: string;
    createEditDelete: string;
    newPod: string;
    editPod: string;
    deletePod: string;
    deletePodConfirmTitle: string;
    deletePodConfirmBody: (title: string) => string;
    podDeleted: string;
    podDetails: string;
    podAttendance: string;
    aiMonitoring: string;
    activity: (title: string) => string;
    aiSummary: (summary: string) => string;
    noActivity: string;
    noPods: string;
    statusFilter: string;
  };
  monitoring: {
    title: string;
    subtitle: string;
    search: string;
    when: string;
    actor: string;
    unknownActor: string;
    changes: string;
    changesCount: (total: number) => string;
    noChanges: string;
    emptyValue: string;
    note: string;
    aiRisk: string;
    aiRiskChip: (risk: string) => string;
    aiSummary: string;
    noActivity: string;
  };
  editClub: {
    title: string;
    eyebrow: string;
    backToPods: string;
    saved: string;
    notFound: string;
    addImage: string;
  };
  editor: {
    eyebrow: (club: string) => string;
    hostNote: string;
    backLabel: string;
    podCreated: string;
    draftSaved: string;
    podUpdated: string;
    notFound: string;
  };
}

function dashboardLabels(t: ClubAdminTranslate): ClubAdminLabels['dashboard'] {
  return {
    eyebrow: t('clubAdmin.dashboard.eyebrow'),
    title: t('clubAdmin.dashboard.title'),
    subtitle: t('clubAdmin.dashboard.subtitle'),
    range: t('clubAdmin.dashboard.range'),
    perClubBreakdown: t('clubAdmin.dashboard.perClubBreakdown'),
    searchClubs: t('clubAdmin.dashboard.searchClubs'),
    monthlyTrend: t('clubAdmin.dashboard.monthlyTrend'),
    monthlyTrendChart: t('clubAdmin.dashboard.monthlyTrendChart'),
    trendEmpty: t('clubAdmin.dashboard.trendEmpty'),
    yourCategories: t('clubAdmin.dashboard.yourCategories'),
    yourCategoriesHint: t('clubAdmin.dashboard.yourCategoriesHint'),
    categoriesEmpty: t('clubAdmin.dashboard.categoriesEmpty'),
    clubs: t('clubAdmin.dashboard.clubs'),
    pods: t('clubAdmin.dashboard.pods'),
    noClubs: t('clubAdmin.dashboard.noClubs'),
    columnTotalPods: t('clubAdmin.dashboard.column.totalPods'),
    columnRating: t('clubAdmin.dashboard.column.rating'),
    columnRevenue: t('clubAdmin.dashboard.column.revenue'),
  };
}

function clubsLabels(t: ClubAdminTranslate): ClubAdminLabels['clubs'] {
  return {
    yourClubs: t('clubAdmin.clubs.yourClubs'),
    subtitle: t('clubAdmin.clubs.subtitle'),
    pods: t('clubAdmin.clubs.pods'),
    upcoming: t('clubAdmin.clubs.upcoming'),
    followers: t('clubAdmin.clubs.followers'),
    verified: t('clubAdmin.clubs.verified'),
    unverified: t('clubAdmin.clubs.unverified'),
    editClub: t('clubAdmin.clubs.editClub'),
    noClubs: t('clubAdmin.clubs.noClubs'),
    search: t('clubAdmin.clubs.search'),
  };
}

function podsLabels(t: ClubAdminTranslate): ClubAdminLabels['pods'] {
  return {
    title: t('clubAdmin.pods.title'),
    clubPods: t('clubAdmin.pods.clubPods'),
    createEditDelete: t('clubAdmin.pods.createEditDelete'),
    newPod: t('clubAdmin.pods.newPod'),
    editPod: t('clubAdmin.pods.editPod'),
    deletePod: t('clubAdmin.pods.deletePod'),
    deletePodConfirmTitle: t('clubAdmin.pods.deletePodConfirmTitle'),
    deletePodConfirmBody: (title) => t('clubAdmin.pods.deletePodConfirmBody', { vars: { title } }),
    podDeleted: t('clubAdmin.pods.podDeleted'),
    podDetails: t('clubAdmin.pods.podDetails'),
    podAttendance: t('clubAdmin.pods.podAttendance'),
    aiMonitoring: t('clubAdmin.pods.aiMonitoring'),
    activity: (title) => t('clubAdmin.pods.activity', { vars: { title } }),
    aiSummary: (summary) => t('clubAdmin.pods.aiSummary', { vars: { summary } }),
    noActivity: t('clubAdmin.pods.noActivity'),
    noPods: t('clubAdmin.pods.noPods'),
    statusFilter: t('clubAdmin.pods.statusFilter'),
  };
}

function monitoringLabels(t: ClubAdminTranslate): ClubAdminLabels['monitoring'] {
  return {
    title: t('clubAdmin.monitoring.title'),
    subtitle: t('clubAdmin.monitoring.subtitle'),
    search: t('clubAdmin.monitoring.search'),
    when: t('clubAdmin.monitoring.when'),
    actor: t('clubAdmin.monitoring.actor'),
    unknownActor: t('clubAdmin.monitoring.unknownActor'),
    changes: t('clubAdmin.monitoring.changes'),
    changesCount: (total) => t('clubAdmin.monitoring.changesCount', { vars: { total } }),
    noChanges: t('clubAdmin.monitoring.noChanges'),
    emptyValue: t('clubAdmin.monitoring.emptyValue'),
    note: t('clubAdmin.monitoring.note'),
    aiRisk: t('clubAdmin.monitoring.aiRisk'),
    aiRiskChip: (risk) => t('clubAdmin.monitoring.aiRiskChip', { vars: { risk } }),
    aiSummary: t('clubAdmin.monitoring.aiSummary'),
    noActivity: t('clubAdmin.monitoring.noActivity'),
  };
}

function editClubLabels(t: ClubAdminTranslate): ClubAdminLabels['editClub'] {
  return {
    title: t('clubAdmin.editClub.title'),
    eyebrow: t('clubAdmin.editClub.eyebrow'),
    backToPods: t('clubAdmin.editClub.backToPods'),
    saved: t('clubAdmin.editClub.saved'),
    notFound: t('clubAdmin.editClub.notFound'),
    addImage: t('clubAdmin.editClub.addImage'),
  };
}

function editorLabels(t: ClubAdminTranslate): ClubAdminLabels['editor'] {
  return {
    eyebrow: (club) => t('clubAdmin.editor.eyebrow', { vars: { club } }),
    hostNote: t('clubAdmin.editor.hostNote'),
    backLabel: t('clubAdmin.editor.backLabel'),
    podCreated: t('clubAdmin.editor.podCreated'),
    draftSaved: t('clubAdmin.editor.draftSaved'),
    podUpdated: t('clubAdmin.editor.podUpdated'),
    notFound: t('clubAdmin.editor.notFound'),
  };
}

/** The chrome of every Club Admin page, page by page. */
export function clubAdminLabels(t: ClubAdminTranslate): ClubAdminLabels {
  return {
    dashboard: dashboardLabels(t),
    clubs: clubsLabels(t),
    pods: podsLabels(t),
    monitoring: monitoringLabels(t),
    editClub: editClubLabels(t),
    editor: editorLabels(t),
  };
}
