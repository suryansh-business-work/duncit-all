import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';

/**
 * The few things every Auto Pod module shares — kept out of the service so
 * the location helpers, the claims and the recovery sweep can import them
 * without a circular import through `autoPod.service`.
 */

export function autoPodFail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

/** Stages an Auto Pod can still be acted on or pulled from. */
export const PRE_LIVE_STAGES = ['OPEN', 'CLAIMING'] as const;

/** Mongo filter for "still enrolling". */
export const PRE_LIVE_FILTER = { stage: { $in: [...PRE_LIVE_STAGES] } };

/** An event row for the Auto Pod's own trail (PodAuditLog needs a real pod). */
export function autoPodEvent(
  action: string,
  actorUserId?: string | null,
  actorName = '',
  note = ''
) {
  return {
    action,
    actor_user_id: actorUserId ? new Types.ObjectId(actorUserId) : null,
    actor_name: actorName,
    note,
    at: new Date(),
  };
}

/**
 * Every enrolment the offer needs: a host and a club always, a venue only when
 * the pod is physical — a virtual pod has no venue to enrol.
 */
export const isAutoPodComplete = (doc: {
  pod_mode?: string | null;
  venue_claim: unknown;
  host_claim: unknown;
  club_claim: unknown;
}) => !!doc.host_claim && !!doc.club_claim && (doc.pod_mode === 'VIRTUAL' || !!doc.venue_claim);

/**
 * Mongo filter for the same rule. Offers written before `pod_mode` existed
 * carry no field at all, which is why "physical" is spelled as "not VIRTUAL"
 * here and in PHYSICAL_FILTER rather than as an equality.
 */
export const AUTO_POD_COMPLETE_FILTER = {
  host_claim: { $ne: null },
  club_claim: { $ne: null },
  $or: [{ pod_mode: 'VIRTUAL' }, { venue_claim: { $ne: null } }],
};

/**
 * The mirror of AUTO_POD_COMPLETE_FILTER — an offer still waiting on somebody.
 * Its one `$or` sits at the top, so a caller adding its own `$or` must `$and`.
 */
export const AUTO_POD_INCOMPLETE_FILTER = {
  $or: [{ host_claim: null }, { club_claim: null }, { pod_mode: { $ne: 'VIRTUAL' }, venue_claim: null }],
};

/** Offers a venue can act on at all — the physical ones. */
export const PHYSICAL_FILTER = { pod_mode: { $ne: 'VIRTUAL' } };

/** An offer an admin has paused is offered to nobody until it is resumed. */
export const ACTIVE_FILTER = { is_active: { $ne: false } };

const PENDING_ROLES = new Set(['VENUE', 'HOST', 'CLUB']);

/**
 * The admin table's "still waiting on" filter as a Mongo clause: a pre-live
 * offer with that role's claim empty — and, for the venue, physical, since a
 * virtual offer never waits on one. Several roles OR together; anything that
 * is not a role is ignored. Null when nothing was asked for.
 */
export function pendingBaseFilter(roles: readonly string[]): Record<string, unknown> | null {
  const clauses = roles
    .filter((role) => PENDING_ROLES.has(role))
    .map((role) => {
      if (role === 'VENUE') return { ...PRE_LIVE_FILTER, ...PHYSICAL_FILTER, venue_claim: null };
      if (role === 'HOST') return { ...PRE_LIVE_FILTER, host_claim: null };
      return { ...PRE_LIVE_FILTER, club_claim: null };
    });
  if (clauses.length === 0) return null;
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

/**
 * Enrolment runs venue → host → club admin. The host's turn comes once a venue
 * has fixed a slot (at once on a virtual offer, which has no venue); the club
 * admin's once a host is on it. The venue's turn is simply "no venue yet".
 */
export const HOST_TURN_FILTER = { $or: [{ pod_mode: 'VIRTUAL' }, { venue_claim: { $ne: null } }] };
export const CLUB_TURN_FILTER = { host_claim: { $ne: null } };

export type AutoPodTurn = 'venue' | 'host' | 'club';

type Claims = {
  pod_mode?: string | null;
  venue_claim: unknown;
  host_claim: unknown;
  club_claim: unknown;
};

/** Every role the offer is still waiting on, in enrolment order. */
export function autoPodMissingRoles(doc: Claims): AutoPodTurn[] {
  const missing: AutoPodTurn[] = [];
  if (doc.pod_mode !== 'VIRTUAL' && !doc.venue_claim) missing.push('venue');
  if (!doc.host_claim) missing.push('host');
  if (!doc.club_claim) missing.push('club');
  return missing;
}

/** Whose turn it is on this offer, or null once everyone needed is on it. */
export function autoPodNextRole(doc: Claims): AutoPodTurn | null {
  return autoPodMissingRoles(doc)[0] ?? null;
}

/**
 * The venue window counts from the last time the offer was put in front of
 * venues — `venue_window_from`, reset when a venue withdraws — and from
 * `created_at` on rows written before that field existed.
 */
export const venueWindowOpen = (cutoff: Date) => ({
  $or: [
    { venue_window_from: { $gt: cutoff } },
    { venue_window_from: null, created_at: { $gt: cutoff } },
  ],
});
export const venueWindowPassed = (cutoff: Date) => ({
  $or: [
    { venue_window_from: { $lte: cutoff } },
    { venue_window_from: null, created_at: { $lte: cutoff } },
  ],
});
