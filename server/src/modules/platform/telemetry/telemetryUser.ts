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

/** The account behind an id, cached in memory only. Null when it cannot be found. */
async function lookupAccount(id: string): Promise<ITelemetryUser | null> {
  if (!isValidObjectId(id)) return null;
  const hit = cache.get(id);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.user;

  let row: UserLookupRow | null = null;
  try {
    row = await UserModel.findById(id)
      .select('profile.first_name profile.last_name auth.email auth.phone metadata.role_keys')
      .lean<UserLookupRow>();
  } catch {
    // Telemetry must never be the reason a request fails; an unenriched user
    // is a complete answer, just a less useful one.
    return null;
  }
  if (!row) return null;

  const resolved: ITelemetryUser = {
    id,
    name: displayName(row),
    email: row.auth?.email ?? undefined,
    phone: displayPhone(row),
    roles: row.metadata?.role_keys?.length ? row.metadata.role_keys : undefined,
  };
  evictIfFull();
  cache.set(id, { user: resolved, at: Date.now() });
  return resolved;
}

/**
 * What a log STORES about the account behind it: the id and the roles, nothing
 * that names or reaches the person (GDPR data minimisation).
 *
 * The name, email and phone used to be copied onto every log, which meant a
 * second copy of them in a collection kept for months that account deletion
 * could not see. They are now looked up when a triager READS the log
 * ({@link describeLogUser}), so they are always current, and gone the moment
 * the account is.
 *
 * Roles are kept because they are what the log was ABOUT — which screens the
 * caller could reach — and must be the roles at the time, not today's. The
 * database wins over the token, which is a snapshot of whenever it was minted;
 * the token is the fallback for an account the lookup could not find.
 */
export async function resolveLogUser(claimed: {
  id: string;
  roles?: string[];
}): Promise<ITelemetryUser> {
  const account = await lookupAccount(claimed.id);
  const roles = account?.roles ?? (claimed.roles?.length ? claimed.roles : undefined);
  return { id: claimed.id, roles };
}

/** The current name, email and phone behind a stored log user, for the Tech portal. */
export async function describeLogUser(id: string): Promise<ITelemetryUser> {
  return (await lookupAccount(id)) ?? { id };
}

/** Test/ops seam: drop everything remembered so far. */
export function clearLogUserCache(): void {
  cache.clear();
}
