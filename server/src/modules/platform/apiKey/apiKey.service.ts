import { createHash, randomBytes } from 'node:crypto';
import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { ApiKeyModel, type IApiKey } from './apiKey.model';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

const MAX_NAME_LENGTH = 80;
const KEY_PREFIX_LENGTH = 10;

/** Public shape — never includes key_hash. The raw key only exists in create(). */
const toPub = (k: IApiKey) => ({
  id: String(k._id),
  name: k.name,
  key_prefix: k.key_prefix,
  owner_user_id: String(k.owner_user_id),
  scopes: k.scopes ?? [],
  last_used_at: k.last_used_at ? k.last_used_at.toISOString() : null,
  revoked_at: k.revoked_at ? k.revoked_at.toISOString() : null,
  created_at: k.created_at?.toISOString() ?? '',
});

export const apiKeyService = {
  toPub,

  /** Generates a `dk_live_…` key; only its SHA-256 hash is persisted. The raw
   * key is returned exactly once — it can never be recovered afterwards. */
  async create(ownerId: string, name: string) {
    const trimmed = String(name ?? '').trim();
    if (!trimmed) fail('BAD_USER_INPUT', 'Key name is required');
    if (trimmed.length > MAX_NAME_LENGTH) {
      fail('BAD_USER_INPUT', `Key name must be ${MAX_NAME_LENGTH} characters or less`);
    }
    const rawKey = `dk_live_${randomBytes(24).toString('hex')}`;
    const doc = await ApiKeyModel.create({
      name: trimmed,
      key_hash: sha256(rawKey),
      key_prefix: rawKey.slice(0, KEY_PREFIX_LENGTH),
      owner_user_id: new Types.ObjectId(ownerId),
    });
    return { raw_key: rawKey, pub: toPub(doc) };
  },

  async listForOwner(ownerId: string) {
    const docs = await ApiKeyModel.find({ owner_user_id: new Types.ObjectId(ownerId) }).sort({
      created_at: -1,
    });
    return docs.map(toPub);
  },

  /** Owner-scoped revoke — a revoked key immediately stops verifying. */
  async revoke(id: string, ownerId: string) {
    if (!Types.ObjectId.isValid(id)) fail('BAD_USER_INPUT', 'Invalid key id');
    const doc = await ApiKeyModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(id),
        owner_user_id: new Types.ObjectId(ownerId),
        revoked_at: null,
      },
      { $set: { revoked_at: new Date() } },
      { new: true }
    );
    if (!doc) fail('NOT_FOUND', 'API key not found or already revoked');
    return toPub(doc);
  },

  /** Hash lookup of a non-revoked key. Bumps last_used_at fire-and-forget so
   * the hot path never waits on the bookkeeping write. */
  async verify(rawKey: string): Promise<IApiKey | null> {
    const trimmed = String(rawKey ?? '').trim();
    if (!trimmed) return null;
    const doc = await ApiKeyModel.findOne({ key_hash: sha256(trimmed), revoked_at: null });
    if (!doc) return null;
    ApiKeyModel.updateOne({ _id: doc._id }, { $set: { last_used_at: new Date() } })
      .exec()
      .catch((err) => console.error('[apiKey] last_used_at update failed:', err));
    return doc;
  },
};
