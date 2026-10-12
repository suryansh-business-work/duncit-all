import { GraphQLError } from 'graphql';
import type { GraphQLContext } from '@context';
import { hasRole } from '@middleware/rbac';
import { requestIdentity } from '@observability/requestIdentity';
import { STAFF_ROLES } from '@modules/engagement/staffChat/staffChat.model';

/**
 * Hiding a pod or a club — what the flag means, in one place.
 *
 * Hidden is NOT cancelled and NOT a draft: nothing is refunded, no booking is
 * touched, the record stays whole. It only stops being offered — no feed, no
 * search, no club page, no new booking. People already in a hidden pod keep
 * their ticket and their chat, and its host still runs it.
 *
 * A pod is hidden for either of two reasons, stored apart on purpose:
 * `is_hidden` (an admin hid this pod) and `hidden_by_club` (its club is
 * hidden). Showing a club again clears only the second, so a pod that was hidden
 * on its own stays hidden.
 */

/** Longest reason the consoles may store. */
export const HIDE_REASON_MAX = 500;

/** `$ne: true` rather than `false`: rows written before the flag existed have
 * no value at all, and they are visible. */
const NOT_SET = { $ne: true } as const;

/** Mongo conditions matching only the pods a member may be offered. */
export const POD_VISIBLE_FILTER = { is_hidden: NOT_SET, hidden_by_club: NOT_SET } as const;

/** Mongo conditions matching only the clubs a member may be offered. */
export const CLUB_VISIBLE_FILTER = { is_hidden: NOT_SET } as const;

export const isPodHidden = (pod: { is_hidden?: boolean | null; hidden_by_club?: boolean | null } | null | undefined) =>
  !!pod?.is_hidden || !!pod?.hidden_by_club;

/**
 * Refuse a NEW booking on a hidden pod. The detail page is already gone for
 * anyone not on the pod, but booking takes a bare id — and someone already in
 * the pod can still open it, so they must not be able to add to it either.
 */
export function assertPodOpenForBooking(pod: Parameters<typeof isPodHidden>[0]): void {
  if (!isPodHidden(pod)) return;
  throw new GraphQLError('This pod is not open for booking right now.', {
    extensions: { code: 'BAD_REQUEST' },
  });
}

/** The consoles — the only surfaces a hidden record is ever listed on. */
const CONSOLE_SURFACES = new Set(['ADMIN_PORTAL', 'PORTAL']);

/** Everyone who signs in to a staff console: the staff roles plus the
 * directory seats, which open a console without being a job title. */
const HIDDEN_READER_ROLES: readonly string[] = [
  ...STAFF_ROLES,
  'ALL_VENUES_ACCESS',
  'ALL_CLUBS_ACCESS',
  'ALL_CLUB_ADMINS_ACCESS',
  'ALL_HOSTS_ACCESS',
  'ALL_PODS_ACCESS',
];

/**
 * Whether this request may be shown hidden pods and clubs.
 *
 * BOTH halves are required. The role alone is not enough: an admin browsing the
 * app is a member there, and a pod they just hid must vanish from their own
 * feed or "hide" looks broken. The surface alone is not enough either — it is a
 * header the caller declares, so on its own anyone could claim to be a console.
 * The role comes from the verified token.
 */
export function canSeeHidden(ctx: GraphQLContext): boolean {
  if (!ctx.user || !hasRole(ctx.user, HIDDEN_READER_ROLES)) return false;
  return CONSOLE_SURFACES.has(requestIdentity.current()?.surface ?? '');
}

/**
 * The reason to store for a visibility change: mandatory when hiding, always
 * empty when showing — a visible record carrying an old reason would read as
 * though it were still hidden.
 */
export function hideReasonFor(hidden: boolean, reason?: string | null): string {
  if (!hidden) return '';
  const clean = (reason ?? '').trim();
  if (!clean) {
    throw new GraphQLError('A reason is required to hide this.', {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  if (clean.length > HIDE_REASON_MAX) {
    throw new GraphQLError(`The reason can be at most ${HIDE_REASON_MAX} characters.`, {
      extensions: { code: 'BAD_USER_INPUT' },
    });
  }
  return clean;
}
