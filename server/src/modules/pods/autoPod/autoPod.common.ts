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

/** Offers a venue can act on at all — the physical ones. */
export const PHYSICAL_FILTER = { pod_mode: { $ne: 'VIRTUAL' } };
