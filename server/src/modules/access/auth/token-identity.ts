import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { UserModel } from '@modules/access/user/user.model';
import { isAccountLocked } from '@modules/access/accountDeletion/accountDeletion.lock';
import { isSessionSealed } from '@modules/access/auth/session-seal';

/**
 * The account behind a credential that is NOT a session JWT — a table API token,
 * an MCP connection — or null when that credential must be refused.
 *
 * Refused exactly where a session would be: a locked or deleted account, and a
 * credential issued before the account's last password reset (the reset's
 * premise is that someone else may hold the old credentials, and could have
 * minted this one). The roles are read fresh from the user document, so taking
 * a role away takes it away from every token at once.
 */

interface OwnerDoc {
  _id: Types.ObjectId;
  auth?: { email?: string | null };
  profile?: { assigned_city?: string | null };
  metadata?: { role_keys?: string[]; assigned_zones?: string[]; deleted_at?: Date | null };
}

/** The same identity a JWT for this account would carry, read from the user document. */
function toAuthUser(user: OwnerDoc): AuthUser {
  return {
    id: String(user._id),
    email: user.auth?.email ?? null,
    roles: user.metadata?.role_keys ?? [],
    assigned_city: user.profile?.assigned_city ?? null,
    assigned_zones: user.metadata?.assigned_zones ?? [],
  };
}

/**
 * @param userId   the account the credential belongs to
 * @param issuedAt when the credential was issued, in seconds since the epoch
 */
export async function identityForToken(userId: string, issuedAt: number): Promise<AuthUser | null> {
  if (!Types.ObjectId.isValid(userId)) return null;
  if (isAccountLocked(userId) || isSessionSealed(userId, issuedAt)) return null;
  const user = await UserModel.findById(userId)
    .select('auth.email profile.assigned_city metadata.role_keys metadata.assigned_zones metadata.deleted_at')
    .lean<OwnerDoc>();
  if (!user || user.metadata?.deleted_at) return null;
  return toAuthUser(user);
}
