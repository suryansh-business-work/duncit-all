/**
 * One-off seed for Last Activity and Platforms Used, from history the server
 * already holds, so the two Admin > Users columns are not blank for everybody
 * until each member next opens the app. Run through
 * `scripts/backfill-user-activity.ts` (dry run first), never on boot.
 *
 * Every source is a real record:
 * - app sessions (product analytics): who, on which platform, when it ended;
 * - login activity (the last 90 days): when, the declared surface, the device OS;
 * - each account's own `auth.last_login_at`.
 *
 * Idempotent and safe beside live traffic: `$max` and `$addToSet` only ever
 * move the time forward or add to the set, so a re-run, or a run racing the
 * live tracker, can never undo a newer write.
 */
import { Types } from 'mongoose';
import { AppSessionModel } from '@modules/platform/analytics/appSession.model';
import { LoginActivityModel } from '@modules/access/auth/login-activity/loginActivity.model';
import { UserModel } from './user.model';
import { WEB_SURFACES, type UserPlatform } from './user.activity';

/** Product analytics names platforms in lower case; mWeb and the native web build are both the web. */
const SESSION_PLATFORMS: Partial<Record<string, UserPlatform>> = {
  android: 'ANDROID',
  ios: 'IOS',
  web: 'WEB',
  mweb: 'WEB',
};

/** Writes per bulk round trip. */
const BATCH_SIZE = 500;

/** The platform a recorded sign-in came from: the declared surface, then the device OS for the app. */
export function loginPlatform(surface?: string | null, os?: string | null): UserPlatform | null {
  const declared = (surface ?? '').toUpperCase();
  if (WEB_SURFACES.has(declared)) return 'WEB';
  if (declared !== 'NATIVE') return null;
  if (os === 'Android') return 'ANDROID';
  if (os === 'iOS') return 'IOS';
  return null;
}

interface Seed {
  last_at: Date;
  platforms: Set<UserPlatform>;
}

/** Fold one dated record into the account's seed: the latest time wins, platforms add up. */
function addSeed(seeds: Map<string, Seed>, userId: unknown, platform: UserPlatform | null, at: unknown): void {
  if (!userId || !(at instanceof Date)) return;
  const key = String(userId);
  const seed = seeds.get(key);
  if (!seed) {
    seeds.set(key, { last_at: at, platforms: new Set(platform ? [platform] : []) });
    return;
  }
  if (at > seed.last_at) seed.last_at = at;
  if (platform) seed.platforms.add(platform);
}

async function seedsFromHistory(): Promise<Map<string, Seed>> {
  const seeds = new Map<string, Seed>();
  const sessions = await AppSessionModel.aggregate<{ _id: { user: Types.ObjectId; platform: string }; last: Date }>([
    { $match: { user_id: { $ne: null } } },
    { $group: { _id: { user: '$user_id', platform: '$platform' }, last: { $max: '$ended_at' } } },
  ]);
  for (const row of sessions) addSeed(seeds, row._id.user, SESSION_PLATFORMS[row._id.platform] ?? null, row.last);

  const logins = await LoginActivityModel.aggregate<{
    _id: { user: Types.ObjectId; surface: string | null; os: string | null };
    last: Date;
  }>([{ $group: { _id: { user: '$user_id', surface: '$surface', os: '$os' }, last: { $max: '$signed_in_at' } } }]);
  for (const row of logins) addSeed(seeds, row._id.user, loginPlatform(row._id.surface, row._id.os), row.last);

  const signedIn = UserModel.collection.find(
    { 'auth.last_login_at': { $type: 'date' } },
    { projection: { 'auth.last_login_at': 1 } }
  );
  // The filter guarantees `auth.last_login_at` is there.
  for await (const doc of signedIn) addSeed(seeds, doc._id, null, doc.auth.last_login_at);
  return seeds;
}

type BulkOps = Parameters<typeof UserModel.collection.bulkWrite>[0];

function toOps(seeds: Map<string, Seed>): BulkOps {
  return [...seeds].map(([id, seed]) => ({
    updateOne: {
      filter: { _id: new Types.ObjectId(id) },
      update:
        seed.platforms.size > 0
          ? { $max: { 'activity.last_at': seed.last_at }, $addToSet: { 'activity.platforms': { $each: [...seed.platforms] } } }
          : { $max: { 'activity.last_at': seed.last_at } },
    },
  }));
}

export interface UserActivityBackfillResult {
  /** Accounts the history has a dated record for. */
  accounts: number;
  /** Of those, how many it can name at least one platform for. */
  with_platforms: number;
  /** Accounts whose stored activity actually moved (0 on a dry run). */
  written: number;
}

export async function backfillUserActivity({ dryRun }: { dryRun: boolean }): Promise<UserActivityBackfillResult> {
  const seeds = await seedsFromHistory();
  const withPlatforms = [...seeds.values()].filter((seed) => seed.platforms.size > 0).length;
  let written = 0;
  if (!dryRun) {
    const ops = toOps(seeds);
    for (let start = 0; start < ops.length; start += BATCH_SIZE) {
      const result = await UserModel.collection.bulkWrite(ops.slice(start, start + BATCH_SIZE), { ordered: false });
      written += result.modifiedCount;
    }
  }
  return { accounts: seeds.size, with_platforms: withPlatforms, written };
}
