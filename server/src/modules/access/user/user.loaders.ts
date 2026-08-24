/**
 * Batched, per-request reads of the two user fields every list surface shows:
 * the display name and the avatar.
 *
 * `Pod.host_names` and `Pod.co_hosts` each used to issue their own
 * `UserModel.find` — one per pod — so a home feed of 400 pods spent 400 round
 * trips resolving names. Both now go through this loader, and the `pods`
 * resolver primes it with every row's ids first, which turns the whole fan-out
 * into a single `$in` query.
 *
 * The projection is deliberately the UNION of what those callers need, so one
 * cached record answers both and neither can be handed a half-loaded user. It
 * carries no contact details: the club roster reads (`getHosts`,
 * `getClubAdmins`) need email/phone and keep their own, narrower-audience
 * projection rather than widening this one.
 */
import { UserModel } from './user.model';
import { loadMany, primeMany, type CacheCarrier } from '@utils/request-cache';

/** Name + avatar only — everything a public list row renders. */
const ACTOR_PROJECTION = 'profile.first_name profile.last_name profile.profile_photo';

const BUCKET = 'userActor';

export interface UserActor {
  id: string;
  name: string;
  avatar_url: string | null;
}

const toActor = (u: any): UserActor => ({
  id: String(u._id),
  name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim(),
  avatar_url: u.profile?.profile_photo ?? null,
});

async function fetchActors(ids: string[]): Promise<Map<string, UserActor>> {
  const docs = await UserModel.find({ _id: { $in: ids } })
    .select(ACTOR_PROJECTION)
    .lean();
  return new Map(docs.map((u: any) => [String(u._id), toActor(u)]));
}

/** The actors behind `ids`, keyed by id. Ids with no account are simply absent. */
export function loadUserActors(
  carrier: CacheCarrier,
  ids: readonly string[],
): Promise<Map<string, UserActor>> {
  return loadMany<UserActor>(carrier, BUCKET, ids, fetchActors);
}

/** Warm the cache for a whole page before its per-row resolvers run. */
export function primeUserActors(
  carrier: CacheCarrier,
  ids: readonly string[],
): Promise<void> {
  return primeMany<UserActor>(carrier, BUCKET, ids, fetchActors);
}
