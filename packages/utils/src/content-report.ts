/**
 * Reporting a piece of content — the shapes and the enum→copy tables.
 *
 * mWeb, the native app and the Legal portal all render these, so they live
 * here rather than in any one of them (rule 40). The package is dependency-free
 * on purpose: both mobile Dockerfiles already copy it, so the native app can
 * import the same table the MUI surfaces do.
 *
 * The tables map an enum the SERVER stores to a translation KEY, never to
 * English. The literal key strings below are what the shipped-key gate greps
 * for, and what `t()` is called with at each call site.
 */

/** What was reported. Mirrors the server's `ReportTargetType`. */
export type ReportTargetType = 'STORY' | 'POST' | 'POD' | 'CLUB' | 'PROFILE' | 'PRODUCT';

/** Why the reporter says it should not be there. Mirrors `ReportReason`. */
export type ReportReason =
  | 'SPAM'
  | 'NUDITY'
  | 'VIOLENCE'
  | 'HATE'
  | 'HARASSMENT'
  | 'MISINFORMATION'
  | 'SCAM'
  | 'OTHER';

/** Where the Legal team has taken it. Mirrors `ReportStatus`. */
export type ReportStatus = 'RECEIVED' | 'IN_REVIEW' | 'ACTIONED' | 'DISMISSED';

/**
 * The reasons a person can pick, in the order they are offered.
 *
 * Ordered by how often a real report turns out to be one of them, so the
 * common answer is the first thing on screen rather than something to scroll
 * past. OTHER is last because it is the one that costs the reporter more
 * typing — see `reportReasonNeedsDetails`.
 */
export const REPORT_REASONS: readonly ReportReason[] = [
  'SPAM',
  'NUDITY',
  'HARASSMENT',
  'HATE',
  'VIOLENCE',
  'MISINFORMATION',
  'SCAM',
  'OTHER',
];

/** Translation key per reason — the only place the wording is decided. */
export const REPORT_REASON_KEY: Record<ReportReason, string> = {
  SPAM: 'contentReport.reasonSpam',
  NUDITY: 'contentReport.reasonNudity',
  VIOLENCE: 'contentReport.reasonViolence',
  HATE: 'contentReport.reasonHate',
  HARASSMENT: 'contentReport.reasonHarassment',
  MISINFORMATION: 'contentReport.reasonMisinformation',
  SCAM: 'contentReport.reasonScam',
  OTHER: 'contentReport.reasonOther',
};

/**
 * OTHER carries no meaning on its own.
 *
 * Every other reason tells a reviewer what to look for; "Something else" tells
 * them nothing, so the words are required. The server enforces the same rule —
 * this is only what stops the form submitting into a rejection.
 */
export function reportReasonNeedsDetails(reason: ReportReason | null): boolean {
  return reason === 'OTHER';
}

export const REPORT_STATUSES: readonly ReportStatus[] = [
  'RECEIVED',
  'IN_REVIEW',
  'ACTIONED',
  'DISMISSED',
];

export const REPORT_STATUS_KEY: Record<ReportStatus, string> = {
  RECEIVED: 'reportLogs.statusReceived',
  IN_REVIEW: 'reportLogs.statusInReview',
  ACTIONED: 'reportLogs.statusActioned',
  DISMISSED: 'reportLogs.statusDismissed',
};

/** The colour each status wears in the Legal queue. */
export const REPORT_STATUS_COLOR: Record<
  ReportStatus,
  'default' | 'info' | 'success' | 'error'
> = {
  RECEIVED: 'default',
  IN_REVIEW: 'info',
  ACTIONED: 'success',
  DISMISSED: 'error',
};

export const REPORT_TARGET_KEY: Record<ReportTargetType, string> = {
  STORY: 'reportLogs.targetStory',
  POST: 'reportLogs.targetPost',
  POD: 'reportLogs.targetPod',
  CLUB: 'reportLogs.targetClub',
  PROFILE: 'reportLogs.targetProfile',
  PRODUCT: 'reportLogs.targetProduct',
};

/**
 * Is this viewer one of the club's assigned admins?
 *
 * Only a club admin may post a club story, and only they (or the author) may
 * delete one. The SERVER is the gate — this is what decides whether the two
 * apps draw the control at all, and it lives here so they cannot answer the
 * question differently.
 */
export function isClubAdminOf(
  clubAdmins: readonly { id: string }[] | null | undefined,
  viewerId: string | null | undefined
): boolean {
  if (!viewerId) return false;
  return (clubAdmins ?? []).some((admin) => admin.id === viewerId);
}
