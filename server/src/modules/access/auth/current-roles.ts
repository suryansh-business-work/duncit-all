import { Types } from 'mongoose';
import { cacheDel, cacheGet, cacheSet } from '@config/redis';
import { logs } from '@observability/log';
import { UserModel } from '@modules/access/user/user.model';
import { UserRoleModel } from '@modules/access/user/relations';

/**
 * The roles an account holds RIGHT NOW, for the request in flight.
 *
 * Duncit JWTs never expire (`signToken`), and the roles they carry were true
 * when the person signed in. Trusting them alone meant a role taken away kept
 * working on every device that was signed in before the revoke, until that
 * person happened to sign in again. The request now runs with the roles the
 * token carries AND the account still holds — never more than the token (a
 * newly granted role still needs a fresh sign-in, exactly as before) and never
 * one the account has lost. Nobody is signed out: only the lost role stops.
 *
 * COST. A token carrying nothing but USER skips the read entirely — there is
 * no staff access to take back — so a member's request pays nothing. A staff
 * or partner request pays one Redis GET; a miss reads the role rows and the
 * user's role cache in parallel (one round trip, both by indexed id) and keeps
 * the answer for {@link TTL_SECONDS}. Every role write drops the entry
 * (`replaceUserRoles`), so a revoke is felt on the very next request; the TTL
 * only bounds a write made outside that path (a script, another tool).
 *
 * WITHOUT REDIS (local dev, tests) every staff request reads the database —
 * slower, but never stale.
 *
 * FAILS OPEN, like the session seal beside it: a read that throws keeps the
 * token's roles for that one request rather than stripping every admin of
 * access because Mongo blinked. It is logged, so a read that keeps failing is
 * visible.
 */

/** How long a looked-up role set is trusted before it is read again. */
const TTL_SECONDS = 60;

/** The role every account holds; a token carrying only this has nothing to revoke. */
const MEMBER_ROLE = 'USER';

const cacheKey = (userId: string) => `auth:roles:${userId}`;

interface RoleSource {
  metadata?: { role_keys?: string[] };
}

/**
 * Read the role set the way `toPublic` (and so `signToken`) does: the
 * `user_roles` rows when there are any, else the cache on the user document
 * that `replaceUserRoles` writes in the same transaction. Reading it any other
 * way would let the two disagree and strip a role the token was legitimately
 * issued with.
 */
async function readRoles(userId: string): Promise<string[]> {
  if (!Types.ObjectId.isValid(userId)) return [];
  const oid = new Types.ObjectId(userId);
  const [rows, doc] = await Promise.all([
    UserRoleModel.find({ user_id: oid }).select('role').lean(),
    UserModel.findById(oid).select('metadata.role_keys').lean<RoleSource>(),
  ]);
  // No account, no roles: a deleted member's old token holds nothing.
  if (!doc) return [];
  if (rows.length > 0) return [...new Set(rows.map((row) => String(row.role)))];
  return doc.metadata?.role_keys ?? [];
}

/** The account's current roles — cached — or null when they could not be read. */
async function currentRoles(userId: string): Promise<string[] | null> {
  const key = cacheKey(userId);
  const cached = await cacheGet<string[]>(key);
  if (cached) return cached;
  try {
    const roles = await readRoles(userId);
    await cacheSet(key, roles, TTL_SECONDS);
    return roles;
  } catch (error) {
    logs.server.warn('auth', 'current-roles', { error, userId, msg: 'role read failed; token roles kept' });
    return null;
  }
}

/** The roles this request runs with: the token's, minus any the account has lost. */
export async function effectiveRoles(userId: string, tokenRoles: readonly string[]): Promise<string[]> {
  if (tokenRoles.every((role) => role === MEMBER_ROLE)) return [...tokenRoles];
  const current = await currentRoles(userId);
  if (!current) return [...tokenRoles];
  const held = new Set(current);
  return tokenRoles.filter((role) => held.has(role));
}

/**
 * Forget the cached role set so the next request reads the new one. Called
 * after every role write commits.
 *
 * A request that read the OLD roles just before the write could still cache
 * them just after this delete; the TTL above is what bounds that narrow race.
 */
export function forgetCurrentRoles(userId: string): Promise<void> {
  return cacheDel(cacheKey(userId));
}
