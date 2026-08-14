import { isValidObjectId } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import type { ITelemetryUser } from './telemetry.model';

/**
 * Turning the id in a JWT into a person somebody can call.
 *
 * The token carries an id, an email and the roles — enough to attribute a bug,
 * not enough to act on one. "66b1f0…" in the Bugs table tells a triager
 * nothing; "Priya Sharma · +91 98…" tells them who to ring. So the account is
 * read once and remembered.
 *
 * The cache is what makes that affordable. A burst of errors is the normal
 * shape of an incident — one broken deploy, the same account, hundreds of logs
 * in a minute — and a lookup per log would put that burst straight onto the
 * database at exactly the moment it is least able to take it.
 */

interface CacheEntry {
  user: ITelemetryUser;
  at: number;
}

/** Long enough to cover an incident, short enough that a rename lands the same day. */
const TTL_MS = 10 * 60 * 1000;
/** Bounded so a scripted attack cannot grow this map without limit. */
const MAX_ENTRIES = 500;

const cache = new Map<string, CacheEntry>();

/** Oldest-first eviction; the map preserves insertion order, so the first key is it. */
function evictIfFull(): void {
  if (cache.size < MAX_ENTRIES) return;
  const oldest = cache.keys().next();
  if (!oldest.done) cache.delete(oldest.value);
}

interface UserLookupRow {
  profile?: { first_name?: string; last_name?: string } | null;
  auth?: { email?: string; phone?: { extension?: string; number?: string } | null } | null;
  /**
   * Roles live at `metadata.role_keys`, not at the top level. The flat
   * `roles` alias is a mongoose VIRTUAL, and `.lean()` strips virtuals — so
   * reading either short name here returns undefined for every account.
   */
  metadata?: { role_keys?: string[] | null } | null;
}

function displayName(row: UserLookupRow): string | undefined {
  const name = [row.profile?.first_name, row.profile?.last_name].filter(Boolean).join(' ').trim();
  return name || undefined;
}

function displayPhone(row: UserLookupRow): string | undefined {
  const phone = row.auth?.phone;
  if (!phone?.number) return undefined;
  return phone.extension ? `${phone.extension}${phone.number}` : phone.number;
}

/**
 * Everything known about the account behind a log, cached.
 *
 * The database wins wherever it answers. A Duncit token never expires, so the
 * email and roles inside one are a snapshot of whenever it was minted — a role
 * granted or revoked since then is not in it, and attributing a bug to
 * yesterday's permissions is how a triager reaches the wrong conclusion about
 * who could even reach the screen. The token is the fallback, for the account
 * the lookup could not find: deleted, or from another environment. Losing the
 * whole attribution over a missing row would be the worse answer.
 */
export async function resolveLogUser(claimed: {
  id: string;
  email?: string;
  roles?: string[];
}): Promise<ITelemetryUser> {
  const fromToken: ITelemetryUser = {
    id: claimed.id,
    email: claimed.email,
    roles: claimed.roles?.length ? claimed.roles : undefined,
  };
  if (!isValidObjectId(claimed.id)) return fromToken;

  const hit = cache.get(claimed.id);
  if (hit && Date.now() - hit.at < TTL_MS) return merge(hit.user, fromToken);

  let row: UserLookupRow | null = null;
  try {
    row = await UserModel.findById(claimed.id)
      .select('profile.first_name profile.last_name auth.email auth.phone metadata.role_keys')
      .lean<UserLookupRow>();
  } catch {
    // Telemetry must never be the reason a request fails; an unenriched user
    // is a complete answer, just a less useful one.
    return fromToken;
  }
  if (!row) return fromToken;

  const resolved: ITelemetryUser = {
    id: claimed.id,
    name: displayName(row),
    email: row.auth?.email ?? undefined,
    phone: displayPhone(row),
    roles: row.metadata?.role_keys?.length ? row.metadata.role_keys : undefined,
  };
  evictIfFull();
  cache.set(claimed.id, { user: resolved, at: Date.now() });
  return merge(resolved, fromToken);
}

/** The looked-up account, falling back to the token for anything it lacked. */
function merge(resolved: ITelemetryUser, fromToken: ITelemetryUser): ITelemetryUser {
  return {
    id: resolved.id,
    name: resolved.name,
    email: resolved.email ?? fromToken.email,
    phone: resolved.phone,
    roles: resolved.roles ?? fromToken.roles,
  };
}

/** Test/ops seam: drop everything remembered so far. */
export function clearLogUserCache(): void {
  cache.clear();
}
