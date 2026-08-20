/**
 * The Follow button's state machine — one definition for mWeb and native
 * (rule 27), so the two surfaces cannot disagree about what a tap does.
 *
 * The pivotal rule: following a PRIVATE profile is a REQUEST, not a follow.
 * The server enforces that (it is the only thing that writes a follow edge);
 * this module exists so the button predicts the same outcome the server will
 * produce, which is what makes an optimistic update safe.
 */

/** Mirrors the server's `FollowStatus` enum on PublicProfile. */
export type FollowStatus = 'NONE' | 'REQUESTED' | 'FOLLOWING';

/** The mutation a tap should fire in each state. */
export type FollowAction = 'FOLLOW' | 'UNFOLLOW' | 'CANCEL_REQUEST';

/**
 * What tapping the button does right now.
 *
 * REQUESTED withdraws rather than unfollows: there is no edge to remove yet,
 * and calling unfollow there would silently do nothing while the button
 * appeared to change.
 */
export function followActionFor(status: FollowStatus): FollowAction {
  if (status === 'FOLLOWING') return 'UNFOLLOW';
  return status === 'REQUESTED' ? 'CANCEL_REQUEST' : 'FOLLOW';
}

/**
 * Where the button lands after that tap, for the optimistic update.
 *
 * `isPrivate` is what splits FOLLOW into two outcomes — REQUESTED on a private
 * profile, FOLLOWING on a public one. Getting this wrong is the original bug in
 * UI form: a private profile that flips straight to "Following" tells the user
 * something the server did not do.
 */
export function nextFollowStatus(status: FollowStatus, isPrivate: boolean): FollowStatus {
  const action = followActionFor(status);
  if (action === 'FOLLOW') return isPrivate ? 'REQUESTED' : 'FOLLOWING';
  // Both UNFOLLOW and CANCEL_REQUEST land back at NONE.
  return 'NONE';
}

/**
 * Resolve the status from a profile payload. Prefers the server's
 * `follow_status`, falling back to the older `is_following` boolean so a
 * response from a not-yet-deployed server still renders a correct two-state
 * button instead of an empty one.
 */
export function readFollowStatus(profile: {
  follow_status?: string | null;
  is_following?: boolean | null;
}): FollowStatus {
  const status = profile?.follow_status;
  if (status === 'FOLLOWING' || status === 'REQUESTED' || status === 'NONE') return status;
  return profile?.is_following ? 'FOLLOWING' : 'NONE';
}

/**
 * Resolve the status from the viewer's own `me` lists, for screens that render
 * many follow buttons off one `me` payload rather than per-row profiles.
 * Following wins over requested for the same reason it does everywhere else.
 */
export function followStatusFrom(
  followingIds: ReadonlySet<string>,
  requestedIds: ReadonlySet<string>,
  targetId: string
): FollowStatus {
  if (followingIds.has(targetId)) return 'FOLLOWING';
  return requestedIds.has(targetId) ? 'REQUESTED' : 'NONE';
}

/** The i18n key for each state's button label — the copy itself lives in the
 * shared bundle, so mWeb and native read the same words (rule 38). */
export const FOLLOW_LABEL_KEY: Record<FollowStatus, string> = {
  NONE: 'mweb.follow.follow',
  REQUESTED: 'mweb.follow.requested',
  FOLLOWING: 'mweb.follow.following',
};

/**
 * What a FOLLOW_REQUEST notification row should render right now.
 *
 * mWeb and native both own a Tamagui/MUI view of this row, so the DECISION
 * lives here and only the pixels differ (rule 40). The ordering matters:
 *
 *  - ANSWER      the request is still open — Accept / Deny.
 *  - FOLLOW_BACK it was accepted, and the viewer does NOT follow them back yet.
 *  - SETTLED     nothing left to do — it was denied, or it was accepted and the
 *                viewer already follows them, which is precisely when Follow
 *                Back must be hidden rather than offered.
 *  - HIDDEN      not an actionable follow row at all.
 */
export type FollowRequestRowState = 'HIDDEN' | 'ANSWER' | 'FOLLOW_BACK' | 'SETTLED';

export function followRequestRowState(row: {
  actionType?: string | null;
  requestId?: string | null;
  status?: string | null;
  followBackStatus?: string | null;
}): FollowRequestRowState {
  if (row.actionType !== 'FOLLOW_REQUEST' || !row.requestId) return 'HIDDEN';
  // A row whose status has not loaded yet is treated as open: the request only
  // stops being answerable once the server says so.
  if (!row.status || row.status === 'PENDING') return 'ANSWER';
  if (row.status !== 'ACCEPTED') return 'SETTLED';
  // Accepted. FOLLOWING is the one state with nothing to offer — REQUESTED
  // still renders the button so the viewer can see their ask is pending.
  return row.followBackStatus === 'FOLLOWING' ? 'SETTLED' : 'FOLLOW_BACK';
}

/** The i18n key for the Follow Back button in each of its two live states.
 * Literal keys, because the shipped-key gate greps for them (rule 38). */
export function followBackLabelKey(followBackStatus?: string | null): string {
  return followBackStatus === 'REQUESTED' ? 'mweb.follow.requested' : 'mweb.follow.followBack';
}

/** Whether tapping Follow Back can still do anything. A pending ask cannot be
 * re-sent, so the button reads "Requested" and stops accepting taps. */
export function canFollowBack(followBackStatus?: string | null): boolean {
  return followBackStatus !== 'REQUESTED' && followBackStatus !== 'FOLLOWING';
}
