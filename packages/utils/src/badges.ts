/**
 * Badge vocabulary shared by mWeb and the native app (rules 27/40): the
 * condition list, the i18n key that states each condition's GOAL, the window
 * that goal is measured over (its "unlock timeline"), and the two pure
 * derivations both surfaces need to draw a progress row.
 *
 * Framework-free on purpose — the MUI and Tamagui views live in their own apps
 * and render from this one vocabulary, so the two can never disagree about what
 * a badge asks for. The server owns the numbers; nothing here counts anything.
 *
 * The i18n keys are written out as literals (never assembled from a condition)
 * so the translation-key gate can see every key in source.
 */

export const BADGE_CONDITIONS = [
  'POD_JOIN_COUNT',
  'POD_HOST_COUNT',
  'CLUB_JOIN_COUNT',
  'POD_REFERRAL_COUNT',
  'POD_ATTEND_COUNT',
  'CATEGORY_POD_ATTEND_COUNT',
  'PLUS_ONE_POD_COUNT',
  'DISTINCT_CATEGORY_COUNT',
  'MONTHLY_POD_ATTEND_COUNT',
  'ROLE_GRANTED',
  'MANUAL',
] as const;

export type BadgeCondition = (typeof BADGE_CONDITIONS)[number];

/**
 * What the member has to DO, per condition. `{target}` is the badge's
 * threshold — deliberately not named `count`, which the translator reserves for
 * its own plural counter and would blank out here.
 */
export const BADGE_GOAL_KEY: Record<BadgeCondition, string> = {
  POD_JOIN_COUNT: 'mweb.badges.goalPodJoin',
  POD_HOST_COUNT: 'mweb.badges.goalPodHost',
  CLUB_JOIN_COUNT: 'mweb.badges.goalClubJoin',
  POD_REFERRAL_COUNT: 'mweb.badges.goalPodReferral',
  POD_ATTEND_COUNT: 'mweb.badges.goalPodAttend',
  CATEGORY_POD_ATTEND_COUNT: 'mweb.badges.goalCategoryAttend',
  PLUS_ONE_POD_COUNT: 'mweb.badges.goalPlusOne',
  DISTINCT_CATEGORY_COUNT: 'mweb.badges.goalDistinctCategory',
  MONTHLY_POD_ATTEND_COUNT: 'mweb.badges.goalMonthlyAttend',
  ROLE_GRANTED: 'mweb.badges.goalRoleGranted',
  MANUAL: 'mweb.badges.goalManual',
};

/**
 * The unlock timeline: the window a goal is measured over. Every counting badge
 * adds up a member's whole history; Monthly Maverick resets with the calendar;
 * the partner badges and hand-awarded ones land the moment they are approved.
 */
export const BADGE_WINDOWS = ['LIFETIME', 'CALENDAR_MONTH', 'ON_APPROVAL'] as const;

export type BadgeWindow = (typeof BADGE_WINDOWS)[number];

export const BADGE_WINDOW: Record<BadgeCondition, BadgeWindow> = {
  POD_JOIN_COUNT: 'LIFETIME',
  POD_HOST_COUNT: 'LIFETIME',
  CLUB_JOIN_COUNT: 'LIFETIME',
  POD_REFERRAL_COUNT: 'LIFETIME',
  POD_ATTEND_COUNT: 'LIFETIME',
  CATEGORY_POD_ATTEND_COUNT: 'LIFETIME',
  PLUS_ONE_POD_COUNT: 'LIFETIME',
  DISTINCT_CATEGORY_COUNT: 'LIFETIME',
  MONTHLY_POD_ATTEND_COUNT: 'CALENDAR_MONTH',
  ROLE_GRANTED: 'ON_APPROVAL',
  MANUAL: 'ON_APPROVAL',
};

/** Label key per window — the line under the goal on every badge row. */
export const BADGE_WINDOW_KEY: Record<BadgeWindow, string> = {
  LIFETIME: 'mweb.badges.windowLifetime',
  CALENDAR_MONTH: 'mweb.badges.windowCalendarMonth',
  ON_APPROVAL: 'mweb.badges.windowOnApproval',
};

/** One badge's standing for one member, as the server reports it. */
export interface BadgeProgressLike {
  achieved: boolean;
  current: number;
  target: number;
}

/**
 * How far along the goal a member is, 0-100. An achieved badge always reads
 * 100: the metric can drift back below the threshold (a cancelled ticket), and
 * a bar that slid backwards under an "Achieved" chip reads as a bug.
 */
export function badgeProgressPercent(row: Readonly<BadgeProgressLike>): number {
  if (row.achieved) return 100;
  if (row.target <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((row.current / row.target) * 100)));
}

/**
 * Reading order for the Badges section: what you have earned first, then what
 * you are closest to earning. Returns a new array — the caller's list is often
 * a frozen Apollo result.
 */
export function sortBadgeProgress<T extends BadgeProgressLike>(rows: readonly T[]): T[] {
  // Spread-then-sort rather than `toSorted()`: this file also runs under
  // Hermes in the native app, which does not ship it. The copy is what is
  // sorted, so the caller (often a frozen Apollo result) is untouched.
  return [...rows].sort((a, b) => {
    if (a.achieved !== b.achieved) return a.achieved ? -1 : 1;
    return badgeProgressPercent(b) - badgeProgressPercent(a);
  });
}
