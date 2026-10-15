import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { nameOf } from '@modules/pods/podHelp/podHelp.service';
import { VenueModel } from '@modules/venues/venue/venue.model';
import { EVENT_REQUEST_TARGETS, type EventRequestTarget } from './eventRequest.model';

/**
 * Who an event request is addressed to — a live venue, or an account holding
 * the HOST role — and who answers for it. Shared by the request, the owner's
 * reads and the owner's status change, so "is this yours" has one answer.
 */

export const fail = (code: string, message: string) => new GraphQLError(message, { extensions: { code } });

export const NAME_FIELDS = 'profile.first_name profile.last_name';

export interface EventRequestTargetFacts {
  id: Types.ObjectId;
  name: string;
  /** The venue's owner, or the host themself. */
  ownerId: string;
}

export function parseObjectId(value: string, label: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) throw fail('BAD_USER_INPUT', `Invalid ${label}`);
  return new Types.ObjectId(value);
}

export function assertTargetType(value: string): EventRequestTarget {
  if (!(EVENT_REQUEST_TARGETS as readonly string[]).includes(value)) throw fail('BAD_USER_INPUT', 'Invalid target');
  return value as EventRequestTarget;
}

/** The target as members can see it — an approved, active venue or a current host — else null. */
export async function loadTarget(type: EventRequestTarget, id: Types.ObjectId): Promise<EventRequestTargetFacts | null> {
  if (type === 'VENUE') {
    const venue = await VenueModel.findOne({ _id: id, status: 'APPROVED', is_active: true })
      .select('venue_name owner_user_id')
      .lean();
    return venue ? { id, name: venue.venue_name ?? '', ownerId: String(venue.owner_user_id) } : null;
  }
  const host = await UserModel.findOne({ _id: id, 'metadata.role_keys': 'HOST' }).select(NAME_FIELDS).lean();
  return host ? { id, name: nameOf(host), ownerId: String(id) } : null;
}

/**
 * The targets a partner answers for, read live: the venues they own today, or
 * themself as a host. Never a snapshot on the request — a venue that changes
 * hands takes its requests with it.
 */
export async function ownedTargetIds(type: EventRequestTarget, userId: string): Promise<Types.ObjectId[]> {
  if (type === 'HOST') return [new Types.ObjectId(userId)];
  const venues = await VenueModel.find({ owner_user_id: new Types.ObjectId(userId) }).select('_id').lean();
  return venues.map((venue) => venue._id as Types.ObjectId);
}

/** Whether this account answers for this target. */
export async function ownsTarget(type: EventRequestTarget, targetId: Types.ObjectId, userId: string): Promise<boolean> {
  if (type === 'HOST') return targetId.toHexString() === userId;
  return Boolean(await VenueModel.exists({ _id: targetId, owner_user_id: new Types.ObjectId(userId) }));
}
