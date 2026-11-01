import { Types } from 'mongoose';
import { AppEventModel } from '../appEvent.model';
import { dayKeyExpr } from '../entity/window';

/**
 * Who an event is about.
 *
 * A signed-in event names its member. A signed-out one names only its device,
 * and the same person must not count twice because they browsed before signing
 * in — so a device that some member has signed in on belongs to that member
 * (the last one, on a shared phone). A device nobody signed in on stays a
 * visitor of its own: `d:<device id>`.
 */

export interface ActivityTuple {
  user: string | null;
  device: string;
  /** yyyy-MM-dd in the admin zone. */
  day: string;
}

export const visitorKey = (device: string) => `d:${device}`;
export const isVisitor = (actor: string) => actor.startsWith('d:');

export function actorOf(user: string | null, device: string, owners: ReadonlyMap<string, string>): string {
  return user ?? owners.get(device) ?? visitorKey(device);
}

/** device → member, from the tuples themselves: a device seen signed in owns its signed-out rows too. */
export function ownersFromTuples(tuples: readonly ActivityTuple[]): Map<string, string> {
  const owners = new Map<string, string>();
  for (const tuple of tuples) {
    if (tuple.user) owners.set(tuple.device, tuple.user);
  }
  return owners;
}

/** Every actor's set of active days. */
export function actorDays(tuples: readonly ActivityTuple[], owners: ReadonlyMap<string, string>): Map<string, Set<string>> {
  const days = new Map<string, Set<string>>();
  for (const tuple of tuples) {
    const actor = actorOf(tuple.user, tuple.device, owners);
    const set = days.get(actor) ?? new Set<string>();
    set.add(tuple.day);
    days.set(actor, set);
  }
  return days;
}

/** The member each device was last signed in on, over the whole retained history. */
export async function deviceOwners(devices: readonly string[]): Promise<Map<string, string>> {
  if (devices.length === 0) return new Map();
  const rows = await AppEventModel.aggregate<{ _id: string; user: unknown }>([
    { $match: { device_id: { $in: devices }, user_id: { $ne: null } } },
    { $sort: { device_id: 1, occurred_at: 1 } },
    { $group: { _id: '$device_id', user: { $last: '$user_id' } } },
  ]);
  return new Map(rows.map((row) => [row._id, String(row.user)]));
}

/** The tuples' owners, completed for devices that were only ever signed out inside the tuples. */
export async function ownersFor(tuples: readonly ActivityTuple[]): Promise<Map<string, string>> {
  const owners = ownersFromTuples(tuples);
  const unowned = [...new Set(tuples.filter((tuple) => !tuple.user && !owners.has(tuple.device)).map((t) => t.device))];
  for (const [device, user] of await deviceOwners(unowned)) owners.set(device, user);
  return owners;
}

/** One row per (member, device, day) with any event matching `match`. */
export async function activityTuples(match: Record<string, unknown>, zone: string): Promise<ActivityTuple[]> {
  const rows = await AppEventModel.aggregate<{ _id: { u: unknown; d: string; day: string } }>([
    { $match: match },
    { $group: { _id: { u: '$user_id', d: '$device_id', day: dayKeyExpr('occurred_at', zone) } } },
  ]).allowDiskUse(true);
  return rows.map((row) => ({ user: row._id.u ? String(row._id.u) : null, device: row._id.d, day: row._id.day }));
}

/** Every actor active under `match`, with their active days, stitched. */
export async function stitchedActivity(match: Record<string, unknown>, zone: string): Promise<Map<string, Set<string>>> {
  const tuples = await activityTuples(match, zone);
  return actorDays(tuples, await ownersFor(tuples));
}

/** Of these people, the ones the app saw before `before` — by member or by device. */
export async function seenBefore(actors: Iterable<string>, before: Date): Promise<Set<string>> {
  const users: Types.ObjectId[] = [];
  const devices: string[] = [];
  for (const actor of actors) {
    if (isVisitor(actor)) devices.push(actor.slice(2));
    else if (Types.ObjectId.isValid(actor)) users.push(new Types.ObjectId(actor));
  }
  const earlier = { occurred_at: { $lt: before } };
  const [oldUsers, oldDevices] = await Promise.all([
    users.length ? AppEventModel.distinct('user_id', { ...earlier, user_id: { $in: users } }) : [],
    devices.length ? AppEventModel.distinct('device_id', { ...earlier, device_id: { $in: devices } }) : [],
  ]);
  return new Set([...oldUsers.map(String), ...oldDevices.map((device) => visitorKey(String(device)))]);
}
