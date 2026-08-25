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
 * What an actionable follow notification row should render right now.
 *
 * mWeb and native both own a Tamagui/MUI view of this row, so the DECISION
 * lives here and only the pixels differ (rule 40). The ordering matters:
 *
 *  - ANSWER      the request is still open — Accept / Deny. Follow Back can
 *                ride alongside these; `offersFollowBack` decides that, since
 *                the two follow directions are independent edges.
 *  - FOLLOW_BACK either an accepted request or a new follower, where the
 *                viewer does NOT follow them back yet.
 *  - SETTLED     the request is answered, so there is an outcome to state
 *                instead of Accept / Deny. Follow Back can still ride on it —
 *                again `offersFollowBack`, not this enum, decides that.
 *  - HIDDEN      not an actionable follow row at all.
 */
export type FollowRequestRowState = 'HIDDEN' | 'ANSWER' | 'FOLLOW_BACK' | 'SETTLED';

/** A follow row exactly as `myNotifications` returns it. Named because both
 * decisions below read the same five fields (rule 34). */
export interface FollowNotificationRow {
  actionType?: string | null;
  requestId?: string | null;
  status?: string | null;
  followBackStatus?: string | null;
  /** Who the row is about, i.e. who a Follow Back would follow. A new-follower
   * row has nothing else identifying them, so without it there is no one to
   * follow back. */
  actorId?: string | null;
}

export function followRequestRowState(row: FollowNotificationRow): FollowRequestRowState {
  // "X started following you" — no request to answer, so the whole row is the
  // offer to follow them back. This is the ONLY follow row a public profile
  // ever receives, and rows written before the actor column existed carry no
  // actorId, so they stay inert rather than rendering a button that would have
  // nobody to act on.
  if (row.actionType === 'NEW_FOLLOWER') {
    if (!row.actorId || row.followBackStatus === 'FOLLOWING') return 'HIDDEN';
    return 'FOLLOW_BACK';
  }
  if (row.actionType !== 'FOLLOW_REQUEST' || !row.requestId) return 'HIDDEN';
  // A row whose status has not loaded yet is treated as open: the request only
  // stops being answerable once the server says so.
  if (!row.status || row.status === 'PENDING') return 'ANSWER';
  if (row.status !== 'ACCEPTED') return 'SETTLED';
  // Accepted. FOLLOWING is the one state with nothing to offer — REQUESTED
  // still renders the button so the viewer can see their ask is pending.
  return row.followBackStatus === 'FOLLOWING' ? 'SETTLED' : 'FOLLOW_BACK';
}

/**
 * Whether the row also offers Follow Back, on top of whatever
 * `followRequestRowState` says it offers.
 *
 * This is deliberately NOT a fifth state: A→B and B→A are independent edges,
 * so a request that is still PENDING carries Accept / Deny AND Follow Back.
 * Somebody asking to follow you is exactly the moment you may want to follow
 * them, and making that wait until you have accepted is why people reported
 * having no way to do it from the inbox.
 *
 * The rule is deliberately the simplest one that can be stated in a sentence:
 * EVERY follow row offers Follow Back unless the viewer already follows that
 * person. A DENIED request included — denying someone's ask says nothing about
 * whether you want to follow them, and the button is theirs to ignore.
 *
 * The two things that suppress it: FOLLOWING (there is nothing to do), and a
 * missing `actorId`, which is who the button would follow — rows written before
 * that column existed have nobody to act on. HIDDEN covers both the not-a-follow
 * row case and the already-following NEW_FOLLOWER row.
 */
export function offersFollowBack(row: FollowNotificationRow): boolean {
  if (followRequestRowState(row) === 'HIDDEN') return false;
  return Boolean(row.actorId) && row.followBackStatus !== 'FOLLOWING';
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
