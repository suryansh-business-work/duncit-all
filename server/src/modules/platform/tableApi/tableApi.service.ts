import { randomBytes } from 'node:crypto';
import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { getUrlConfigs } from '@config/url-configs';
import { identityForToken } from '@modules/access/auth/token-identity';
import { logs } from '@observability/log';
import { TableApiTokenModel, type ITableApiToken } from './tableApi.model';

const TOKEN_PREFIX = 'dtt_';
const TRAILING_SLASH = /\/$/;

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
   * The account a raw token acts as, or null — refused wherever a session would
   * be (see identityForToken). The token's last rotation is its issue time.
   */
  async authenticate(rawToken: string): Promise<AuthUser | null> {
    if (!rawToken.startsWith(TOKEN_PREFIX)) return null;
    const doc = await TableApiTokenModel.findOne({ token: rawToken });
    if (!doc) return null;
    const user = await identityForToken(String(doc.user_id), Math.floor(doc.updated_at.getTime() / 1000));
    if (!user) return null;
    await TableApiTokenModel.updateOne({ _id: doc._id }, { $set: { last_used_at: new Date() } });
    return user;
  },
};
