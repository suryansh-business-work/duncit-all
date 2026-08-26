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
