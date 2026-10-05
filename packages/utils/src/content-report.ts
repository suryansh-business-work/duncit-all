/**
 * Reporting a piece of content — the shapes, the documents and the enum→copy
 * tables.
 *
 * mWeb, the native app and the Legal portal all render these, so they live
 * here rather than in any one of them (rule 40). The package is dependency-free
 * on purpose: both mobile Dockerfiles already copy it, so the native app can
 * import the same table the MUI surfaces do.
 *
 * The tables map an enum the SERVER stores to a translation KEY, never to
 * English. The literal key strings below are what the shipped-key gate greps
 * for, and what `t()` is called with at each call site.
 *
 * The REASONS are no longer one of those tables. They are data Legal manages
 * (Legal > UGC Monitoring > Settings), fetched with `REPORT_CATEGORIES_SDL`, so
 * a new category reaches both apps without a release of either.
 */

/** What was reported. Mirrors the server's `ReportTargetType`. */
export type ReportTargetType = 'STORY' | 'POST' | 'POD' | 'CLUB' | 'PROFILE' | 'PRODUCT';

/** Where the Legal team has taken it. Mirrors `ReportStatus`. */
export type ReportStatus = 'RECEIVED' | 'IN_REVIEW' | 'ACTIONED' | 'DISMISSED';

/** Something a reviewer did to a report. Mirrors `ReportActionType`. */
export type ReportActionType =
  | 'TAKEN_DOWN'
  | 'LOOKS_GOOD'
  | 'MAIL_REPORTER'
  | 'MAIL_OWNER'
  | 'STATUS_CHANGED';

/** Who a reviewer is writing to. Mirrors `ReportMailRecipient`. */
export type ReportMailRecipient = 'REPORTER' | 'OWNER';

/** The user-generated content a 3-dot content menu is drawn on. */
export type ReportableKind = 'STORY' | 'POST';

/**
 * Everything the report dialog can be opened on. A profile is reportable but
 * is not a content-menu kind: it has no Delete, and its menu is the profile's
 * own (Block / Report).
 */
export type ReportDialogKind = ReportableKind | 'PROFILE';

/** One reason the report dialog offers, as `reportCategories` returns it. */
export interface ReportCategoryOption {
  /** What the report stores, e.g. COPYRIGHT. */
  key: string;
  label: string;
  /** Optional line under the label; blank when Legal wrote none. */
  description: string;
  /** True when the reporter must describe the problem in their own words. */
  requires_details: boolean;
}

/**
 * The report documents, as SDL strings.
 *
 * mWeb wraps them with Apollo's `gql` and the native app with `graphql-tag`;
 * strings are the one form both accept, so each document lives here once — the
 * same arrangement as the grievance documents beside this file.
 */
export const REPORT_CATEGORIES_SDL = `
  query ReportCategories {
    reportCategories {
      key
      label
      description
      requires_details
    }
  }
`;

export const REPORT_POST_SDL = `
  mutation ReportPost($id: ID!, $reason: String!, $details: String) {
    reportPost(post_doc_id: $id, reason: $reason, details: $details) {
      id
      report_no
    }
  }
`;

/**
 * Report a member's profile. Same receipt as a post: the reference the
 * acknowledgement email and WhatsApp carry.
 */
export const REPORT_PROFILE_SDL = `
  mutation ReportProfile($id: ID!, $reason: String!, $details: String) {
    reportProfile(user_id: $id, reason: $reason, details: $details) {
      id
      report_no
    }
  }
`;

/** Block a member from their profile. Idempotent on the server. */
export const BLOCK_USER_SDL = `
  mutation BlockUser($user_id: ID!) {
    blockUser(user_id: $user_id)
  }
`;

/** Lift a block made earlier. */
export const UNBLOCK_USER_SDL = `
  mutation UnblockUser($user_id: ID!) {
    unblockUser(user_id: $user_id)
  }
`;

/** The lines of copy that differ between reporting a post and reporting a story. */
export interface ReportKindCopy {
  /** The 3-dot button's accessible name. */
  menuLabel: string;
  /** The menu's Delete entry — drawn only for someone who may delete it. */
  delete: string;
  /** The menu's Report entry. */
  report: string;
}

/** What the profile menu's block entry does next: block, or lift a block. */
export type BlockAction = 'BLOCK' | 'UNBLOCK';

/** The keys one block action reads, from the menu entry to the toast after it. */
export interface BlockActionCopy {
  menu: string;
  confirmTitle: string;
  confirmBody: string;
  busy: string;
  done: string;
  failed: string;
}

/**
 * Block and Unblock, as both apps word them. Looked up rather than branched on
 * so mWeb and native cannot drift apart on which line goes where.
 */
export const BLOCK_ACTION_COPY: Record<BlockAction, BlockActionCopy> = {
  BLOCK: {
    menu: 'contentReport.block',
    confirmTitle: 'contentReport.blockConfirmTitle',
    confirmBody: 'contentReport.blockConfirmBody',
    busy: 'contentReport.blocking',
    done: 'contentReport.blockedToast',
    failed: 'contentReport.blockFailed',
  },
  UNBLOCK: {
    menu: 'contentReport.unblock',
    confirmTitle: 'contentReport.unblockConfirmTitle',
    confirmBody: 'contentReport.unblockConfirmBody',
    busy: 'contentReport.unblocking',
    done: 'contentReport.unblockedToast',
    failed: 'contentReport.unblockFailed',
  },
};

/** The report dialog's heading, per thing it can be opened on. */
export const REPORT_DIALOG_TITLE: Record<ReportDialogKind, string> = {
  STORY: 'contentReport.title',
  POST: 'contentReport.titlePost',
  PROFILE: 'contentReport.titleProfile',
};

/**
 * The menu and dialog wording per kind of content.
 *
 * A post and a story share one menu, one dialog and one mutation; only these
 * lines differ, so they are looked up rather than branched on in two apps.
 */
export const REPORT_COPY: Record<ReportableKind, ReportKindCopy> = {
  STORY: {
    menuLabel: 'contentReport.menuLabel',
    delete: 'contentReport.delete',
    report: 'contentReport.report',
  },
  POST: {
    menuLabel: 'contentReport.menuLabelPost',
    delete: 'mweb.profile.deletePost',
    report: 'contentReport.reportPost',
  },
};

/**
 * Some categories carry no meaning on their own.
 *
 * "Nudity" tells a reviewer what to look for; "Something else" tells them
 * nothing, so the words are required. Which categories those are is Legal's
 * call, made per category. The server enforces the same rule — this is only
 * what stops the form submitting into a rejection.
 */
export function reportReasonNeedsDetails(
  category: Pick<ReportCategoryOption, 'requires_details'> | null | undefined
): boolean {
  return category?.requires_details === true;
}

/**
 * The first thing wrong with a report about to be sent, as a translation key —
 * or null when it can go. One function so the two apps cannot disagree about
 * which mistake to name first.
 */
export function reportSubmitError(
  category: Pick<ReportCategoryOption, 'requires_details'> | null | undefined,
  details: string
): string | null {
  if (!category) return 'contentReport.reasonRequired';
  if (reportReasonNeedsDetails(category) && !details.trim()) return 'contentReport.detailsRequired';
  return null;
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

/** What each line of a report's activity log says happened. */
export const REPORT_ACTION_KEY: Record<ReportActionType, string> = {
  TAKEN_DOWN: 'reportLogs.actionTakenDown',
  LOOKS_GOOD: 'reportLogs.actionLooksGood',
  MAIL_REPORTER: 'reportLogs.actionMailReporter',
  MAIL_OWNER: 'reportLogs.actionMailOwner',
  STATUS_CHANGED: 'reportLogs.actionStatusChanged',
};

/** What a reviewer can still do about a report, read off the row itself. */
export interface ReportDecisionState {
  target_type: ReportTargetType;
  status: ReportStatus;
  /** True while the reported content is still up for everyone to see. */
  target_live: boolean;
  target_removed_at: string | null;
}

/**
 * Only posts and stories can be taken down today, and only while they are
 * still up: an expired story or a post its owner already deleted leaves
 * nothing to remove, and its reports are closed from the status instead.
 */
export function canTakeDownReport(report: ReportDecisionState): boolean {
  const removable = report.target_type === 'POST' || report.target_type === 'STORY';
  return removable && report.target_live;
}

/**
 * Content Legal already removed cannot afterwards be ruled fine, and a report
 * already dismissed has nothing left to rule on.
 */
export function canMarkReportOk(report: ReportDecisionState): boolean {
  return !report.target_removed_at && report.status !== 'DISMISSED';
}

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
