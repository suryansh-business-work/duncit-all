/**
 * Developer API keys through their resolvers, against a real database: who may
 * manage them, that every read and write is scoped to the caller, and that a
 * failed bookkeeping write on a verified key does not fail the verification.
 */
import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { makeContext } from '@test/harness';
import { ApiKeyModel } from '../../apiKey.model';
import { apiKeyResolvers } from '../../apiKey.resolver';
import { apiKeyService } from '../../apiKey.service';

const Q = apiKeyResolvers.Query as Record<string, (...a: any[]) => any>;
const M = apiKeyResolvers.Mutation as Record<string, (...a: any[]) => any>;
const owner = new Types.ObjectId().toString();
const tech = makeContext({ id: owner, roles: ['TECH_MANAGER'] });
const other = makeContext({ id: new Types.ObjectId().toString(), roles: ['DEVELOPERS_MANAGER'] });
const outsider = makeContext({ id: new Types.ObjectId().toString(), roles: ['USER'] });

afterEach(() => jest.restoreAllMocks());

describe('the resolvers', () => {
  it('create a key for the caller and hand back the raw key once alongside its public shape', async () => {
    const out = await M.createApiKey({}, { name: ' CI key ' }, tech);
    expect(out.raw_key).toMatch(/^dk_live_[0-9a-f]{48}$/);
    expect(out.api_key).toMatchObject({ name: 'CI key', owner_user_id: owner, revoked_at: null, last_used_at: null });
    expect(out.api_key).not.toHaveProperty('key_hash');
    expect(out.api_key.scopes).toEqual(expect.arrayContaining(['venues:read']));
    expect(out.api_key.created_at).toEqual(expect.any(String));
  });

  it('list and page only the caller’s own keys', async () => {
    await M.createApiKey({}, { name: 'Mine' }, tech);
    await M.createApiKey({}, { name: 'Theirs' }, other);
    expect((await Q.myApiKeys({}, {}, tech)).map((k: { name: string }) => k.name)).toEqual(['Mine']);
    const page = await Q.myApiKeysTable({}, { query: { page: 1, page_size: 10 } }, tech);
    expect(page.total).toBe(1);
    expect(page.rows[0].name).toBe('Mine');
    expect((await Q.myApiKeysTable({}, {}, other)).rows.map((k: { name: string }) => k.name)).toEqual(['Theirs']);
  });

  it('revoke only the caller’s own key', async () => {
    const { api_key } = await M.createApiKey({}, { name: 'Mine' }, tech);
    await expect(M.revokeApiKey({}, { id: api_key.id }, other)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
    const revoked = await M.revokeApiKey({}, { id: api_key.id }, tech);
    expect(revoked.revoked_at).toEqual(expect.any(String));
  });

  it('refuse a caller without a developer role, and a signed-out one', async () => {
    for (const ctx of [outsider, makeContext(null)]) {
      await expect(Q.myApiKeys({}, {}, ctx)).rejects.toBeDefined();
      await expect(Q.myApiKeysTable({}, {}, ctx)).rejects.toBeDefined();
      await expect(M.createApiKey({}, { name: 'x' }, ctx)).rejects.toBeDefined();
      await expect(M.revokeApiKey({}, { id: 'x' }, ctx)).rejects.toBeDefined();
    }
    expect(await ApiKeyModel.countDocuments()).toBe(0);
  });
});

describe('verifying a key', () => {
  it('still answers with the key when stamping its last use fails, and logs the failure', async () => {
    const { raw_key } = await apiKeyService.create(owner, 'Mine');
    const error = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined as never);
    jest.spyOn(ApiKeyModel, 'updateOne').mockReturnValue({ exec: () => Promise.reject(new Error('db down')) } as never);
    const doc = await apiKeyService.verify(`  ${raw_key}  `);
    expect(doc?.name).toBe('Mine');
    await new Promise((resolve) => setImmediate(resolve));
    expect(error).toHaveBeenCalledWith('apiKey', 'verify', expect.objectContaining({ msg: 'last_used_at update failed' }));
  });

  it('shows when a key was last used once it has been', async () => {
    const { raw_key } = await apiKeyService.create(owner, 'Mine');
    await apiKeyService.verify(raw_key);
    let listed = await apiKeyService.listForOwner(owner);
    for (let i = 0; i < 100 && !listed[0].last_used_at; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      listed = await apiKeyService.listForOwner(owner);
    }
    expect(listed[0].last_used_at).toEqual(expect.any(String));
  });

  it('answers null for a key that is only whitespace', async () => {
    await expect(apiKeyService.verify('   ')).resolves.toBeNull();
  });
});
