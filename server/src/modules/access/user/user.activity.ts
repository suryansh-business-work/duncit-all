/**
 * Which platforms an account uses Duncit from, and when it last did: the
 * "Platforms Used" and "Last Activity" columns in Admin > Users.
 *
 * Written from the request itself. Every authenticated GraphQL call passes
 * through `buildContext`, which has already verified the token, so the account
 * is never taken from anything the client claims. The platform comes from the
 * surface the client declares (`x-duncit-surface`) and, for the native app, the
 * OS it declares (`x-duncit-platform`). Store builds from before that header are
 * told apart by their HTTP stack's user agent.
 *
 * Kept cheap on purpose:
 * - throttled in memory to one write per account and platform per interval, so
 *   a screen that fires ten queries costs one write, not ten;
 * - `$max` and `$addToSet` make the write idempotent and order-proof, so a late
 *   write from another server process can never move the time backwards;
 * - it goes through the raw collection because it is not a profile edit: no
 *   `metadata.updated_at` bump, no `updated_by` stamp, and no User Change Logs
 *   row for something the person did not change;
 * - the request never waits on it. A failed write is logged and retried on the
 *   next request instead of failing the call.
 */
import type { Request } from 'express';
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { loadOne, type CacheCarrier } from '@utils/request-cache';
import { UserModel } from './user.model';

/** Display order of the platform icons as well as the stored values. */
export const USER_PLATFORMS = ['ANDROID', 'IOS', 'WEB'] as const;
export type UserPlatform = (typeof USER_PLATFORMS)[number];

/** Browser surfaces: mWeb, the consoles and the websites. */
export const WEB_SURFACES: ReadonlySet<string> = new Set(['MWEB', 'PORTAL', 'ADMIN_PORTAL', 'WEBSITE']);

/** At most one write per account and platform in this window, per server process. */
export const ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;
/** Bounds the throttle's memory; the entry written longest ago is dropped first. */
export const ACTIVITY_THROTTLE_MAX_ENTRIES = 50_000;

function header(req: Pick<Request, 'headers'>, name: string): string {
  const raw = req.headers[name];
  const first = Array.isArray(raw) ? raw[0] : raw;
  return typeof first === 'string' ? first.trim() : '';
}

/**
 * The OS behind a native build that predates the platform header.
 *
 * React Native's own HTTP stack names itself: OkHttp on Android, CFNetwork on
 * iOS. A browser user agent means the native web build, which is the web.
 */
function nativePlatformFromAgent(userAgent: string): UserPlatform | null {
  if (/^Mozilla\//i.test(userAgent)) return 'WEB';
  if (/okhttp|Dalvik|Android/i.test(userAgent)) return 'ANDROID';
  if (/CFNetwork|Darwin|iPhone|iPad|iOS/i.test(userAgent)) return 'IOS';
  return null;
}

/** The platform a request came from, or null when the caller is not a Duncit client. */
export function platformFromRequest(req: Pick<Request, 'headers'>): UserPlatform | null {
  const surface = header(req, 'x-duncit-surface').toUpperCase();
  if (WEB_SURFACES.has(surface)) return 'WEB';
  if (surface !== 'NATIVE') return null;
  const declared = header(req, 'x-duncit-platform').toUpperCase();
  if (declared === 'ANDROID' || declared === 'IOS') return declared;
  return nativePlatformFromAgent(header(req, 'user-agent'));
}

/** Remembers when each key was last written, oldest first, within a fixed bound. */
export function createActivityThrottle(intervalMs: number, maxEntries: number) {
  const lastWrite = new Map<string, number>();
  return {
    /** True when `key` was not written within the interval; records this write. */
    shouldWrite(key: string, now: number): boolean {
      const previous = lastWrite.get(key);
      if (previous !== undefined && now - previous < intervalMs) return false;
      // Re-inserting keeps the Map in write order, which is what the bound evicts by.
      lastWrite.delete(key);
      lastWrite.set(key, now);
      if (lastWrite.size > maxEntries) {
        const [oldest] = lastWrite.keys();
        lastWrite.delete(oldest);
      }
      return true;
    },
    /** Lets the next request write again, after this one's write failed. */
    forget(key: string): void {
      lastWrite.delete(key);
    },
    size(): number {
      return lastWrite.size;
    },
  };
}

const throttle = createActivityThrottle(ACTIVITY_WRITE_INTERVAL_MS, ACTIVITY_THROTTLE_MAX_ENTRIES);
/** Writes still in flight, so a test (or a shutdown) can wait for them. */
const inFlight = new Set<Promise<void>>();

async function writeActivity(userId: string, platform: UserPlatform | null, at: Date): Promise<void> {
  const update = platform
    ? { $max: { 'activity.last_at': at }, $addToSet: { 'activity.platforms': platform } }
    : { $max: { 'activity.last_at': at } };
  await UserModel.collection.updateOne({ _id: new Types.ObjectId(userId) }, update);
}

/**
 * Record that this account used Duncit just now, from `platform` when known.
 * True when a write started, false when the throttle (or a bad id) skipped it.
 * The caller never waits: the write runs in the background and a failure is
 * logged, never thrown.
 */
export function trackUserActivity(userId: string, platform: UserPlatform | null, now: Date = new Date()): boolean {
  if (!Types.ObjectId.isValid(userId)) return false;
  const key = `${userId}:${platform ?? ''}`;
  if (!throttle.shouldWrite(key, now.getTime())) return false;
  const write = writeActivity(userId, platform, now)
    .catch((error: unknown) => {
      throttle.forget(key);
      logs.server.warn('userActivity', 'write failed', { error, user_id: userId, platform });
    })
    .finally(() => inFlight.delete(write));
  inFlight.add(write);
  return true;
}

/** Resolves once every activity write started so far has settled. */
export async function flushUserActivity(): Promise<void> {
  await Promise.all([...inFlight]);
}

/** What the admin reads: the last activity as ISO text, and the platforms in display order. */
export interface UserActivity {
  last_activity_at: string | null;
  platforms_used: UserPlatform[];
}

interface StoredActivity {
  last_at?: Date | null;
  platforms?: string[] | null;
}

export function toUserActivity(stored?: StoredActivity | null): UserActivity {
  const used = new Set(stored?.platforms ?? []);
  return {
    last_activity_at: stored?.last_at ? new Date(stored.last_at).toISOString() : null,
    platforms_used: USER_PLATFORMS.filter((platform) => used.has(platform)),
  };
}

/** The activity of every account on the page, in one query. */
async function fetchActivity(ids: string[]): Promise<Map<string, UserActivity>> {
  const valid = ids.filter((id) => Types.ObjectId.isValid(id));
  if (valid.length === 0) return new Map();
  const rows = await UserModel.find({ _id: { $in: valid } }, { activity: 1 }).lean<
    Array<{ _id: Types.ObjectId; activity?: StoredActivity | null }>
  >();
  return new Map(rows.map((row) => [row._id.toHexString(), toUserActivity(row.activity)]));
}

/** This account's activity, batched with the rest of the page; null when the account is gone. */
export function loadUserActivity(carrier: CacheCarrier, userId: string): Promise<UserActivity | null> {
  return loadOne<UserActivity>(carrier, 'userActivity', userId, fetchActivity);
}
