import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { getUrlConfigs } from '@config/url-configs';
import { UserModel } from '@modules/access/user/user.model';
import { isAccountLocked } from '@modules/access/accountDeletion/accountDeletion.lock';
import { isSessionSealed } from '@modules/access/auth/session-seal';
import { logs } from '@observability/log';
import { TableApiTokenModel, type ITableApiToken } from './tableApi.model';

const TOKEN_PREFIX = 'dtt_';
const TRAILING_SLASH = /\/$/;

interface OwnerDoc {
  _id: Types.ObjectId;
  auth?: { email?: string | null };
  profile?: { assigned_city?: string | null };
  metadata?: { role_keys?: string[]; assigned_zones?: string[]; deleted_at?: Date | null };
}

/** What the "GET API" dialog and Tech → Table API → Settings read. */
async function toAccess(doc: ITableApiToken | null) {
  const { serverUrl } = await getUrlConfigs();
  const base_url = `${serverUrl.replace(TRAILING_SLASH, '')}/table-api`;
  if (!doc) return { token: null, base_url, created_at: null, last_used_at: null };
  return {
    token: doc.token,
    base_url,
    created_at: doc.created_at.toISOString(),
    last_used_at: doc.last_used_at?.toISOString() ?? null,
  };
}

/** The same identity a JWT for this account would carry, read fresh from the user document. */
function toAuthUser(user: OwnerDoc): AuthUser {
  return {
    id: String(user._id),
    email: user.auth?.email ?? null,
    roles: user.metadata?.role_keys ?? [],
    assigned_city: user.profile?.assigned_city ?? null,
    assigned_zones: user.metadata?.assigned_zones ?? [],
  };
}

export const tableApiService = {
  async access(userId: string) {
    return toAccess(await TableApiTokenModel.findOne({ user_id: new Types.ObjectId(userId) }));
  },

  /** Issues the caller's token, replacing any earlier one — every URL built from the old token stops working. */
  async rotate(userId: string) {
    const doc = await TableApiTokenModel.findOneAndUpdate(
      { user_id: new Types.ObjectId(userId) },
      { $set: { token: `${TOKEN_PREFIX}${randomBytes(32).toString('hex')}`, last_used_at: null } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    logs.server.warn('tableApi', 'tokenRotated', { userId });
    return toAccess(doc);
  },

  async revoke(userId: string) {
    await TableApiTokenModel.deleteOne({ user_id: new Types.ObjectId(userId) });
    logs.server.warn('tableApi', 'tokenRevoked', { userId });
    return toAccess(null);
  },

  /**
   * The account a raw token acts as, or null.
   *
   * Refused exactly where a session would be: a deleted or locked account, and a
   * token issued before the account's last password reset (the reset's premise is
   * that someone else may hold the old credentials — and could have minted this).
   */
  async authenticate(rawToken: string): Promise<AuthUser | null> {
    if (!rawToken.startsWith(TOKEN_PREFIX)) return null;
    const doc = await TableApiTokenModel.findOne({ token: rawToken });
    if (!doc) return null;
    const userId = String(doc.user_id);
    const issuedAt = Math.floor(doc.updated_at.getTime() / 1000);
    if (isAccountLocked(userId) || isSessionSealed(userId, issuedAt)) return null;
    const user = await UserModel.findById(doc.user_id)
      .select('auth.email profile.assigned_city metadata.role_keys metadata.assigned_zones metadata.deleted_at')
      .lean<OwnerDoc>();
    if (!user || user.metadata?.deleted_at) return null;
    await TableApiTokenModel.updateOne({ _id: doc._id }, { $set: { last_used_at: new Date() } });
    return toAuthUser(user);
  },
};
