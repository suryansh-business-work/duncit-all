import { Types } from 'mongoose';
import { makeContext } from '@test/harness';
import { UserModel } from '@modules/access/user/user.model';
import { lockAccount, unlockAccount } from '@modules/access/accountDeletion/accountDeletion.lock';
import { sealSessions } from '@modules/access/auth/session-seal';
import { tableApiService } from '../../tableApi.service';
import { tableApiResolvers } from '../../tableApi.resolver';
import { TableApiTokenModel } from '../../tableApi.model';

async function makeStaff() {
  const user = await UserModel.create({
    auth: { email: `table-api-${Date.now()}-${Math.random()}@duncit.com` },
    profile: { first_name: 'Asha', last_name: 'Rao', assigned_city: 'Pune' },
    metadata: { role_keys: ['TECH_MANAGER'], assigned_zones: ['pune-west'] },
  });
  return String(user._id);
}

describe('tableApiService integration', () => {
  it('has no token until one is generated, and always names the API base URL', async () => {
    const access = await tableApiService.access(new Types.ObjectId().toString());
    expect(access.token).toBeNull();
    expect(access.created_at).toBeNull();
    expect(access.base_url).toMatch(/\/table-api$/);
  });

  it('generates a token that acts as its owner, with their live roles, and records its use', async () => {
    const userId = await makeStaff();
    const issued = await tableApiService.rotate(userId);
    expect(issued.token).toMatch(/^dtt_[0-9a-f]{64}$/);
    expect(issued.last_used_at).toBeNull();

    expect(await tableApiService.authenticate(issued.token!)).toEqual({
      id: userId,
      email: expect.stringContaining('@duncit.com'),
      roles: ['TECH_MANAGER'],
      assigned_city: 'Pune',
      assigned_zones: ['pune-west'],
    });
    expect((await tableApiService.access(userId)).last_used_at).toEqual(expect.any(String));
  });

  it('rotating retires the previous token, and revoking retires the current one', async () => {
    const userId = await makeStaff();
    const first = await tableApiService.rotate(userId);
    const second = await tableApiService.rotate(userId);
    expect(second.token).not.toBe(first.token);
    expect(await tableApiService.authenticate(first.token!)).toBeNull();

    const revoked = await tableApiService.revoke(userId);
    expect(revoked.token).toBeNull();
    expect(await tableApiService.authenticate(second.token!)).toBeNull();
    expect(await TableApiTokenModel.countDocuments({ user_id: new Types.ObjectId(userId) })).toBe(0);
  });

  it('refuses anything that is not a live token', async () => {
    expect(await tableApiService.authenticate('')).toBeNull();
    expect(await tableApiService.authenticate('dk_live_abc')).toBeNull();
    expect(await tableApiService.authenticate('dtt_not-issued')).toBeNull();
  });

  it('refuses a locked account and a token older than the last password reset', async () => {
    const locked = await makeStaff();
    const lockedToken = (await tableApiService.rotate(locked)).token!;
    lockAccount(locked);
    expect(await tableApiService.authenticate(lockedToken)).toBeNull();
    unlockAccount(locked);

    const sealed = await makeStaff();
    const sealedToken = (await tableApiService.rotate(sealed)).token!;
    sealSessions(sealed, new Date(Date.now() + 60_000));
    expect(await tableApiService.authenticate(sealedToken)).toBeNull();
  });

  it('refuses a token whose account is gone or deleted', async () => {
    const ghost = new Types.ObjectId().toString();
    const ghostToken = (await tableApiService.rotate(ghost)).token!;
    expect(await tableApiService.authenticate(ghostToken)).toBeNull();

    const deleted = await makeStaff();
    const deletedToken = (await tableApiService.rotate(deleted)).token!;
    await UserModel.updateOne({ _id: deleted }, { $set: { 'metadata.deleted_at': new Date() } });
    expect(await tableApiService.authenticate(deletedToken)).toBeNull();
  });

  it('reads a legacy account with no role or scope fields as a signed-in user with none', async () => {
    const { insertedId } = await UserModel.collection.insertOne({});
    const token = (await tableApiService.rotate(String(insertedId))).token!;
    expect(await tableApiService.authenticate(token)).toEqual({
      id: String(insertedId),
      email: null,
      roles: [],
      assigned_city: null,
      assigned_zones: [],
    });
  });
});

describe('tableApiResolvers', () => {
  it('reads, rotates and revokes only the caller’s own token', async () => {
    const id = await makeStaff();
    const ctx = makeContext({ id });
    expect((await tableApiResolvers.Query.myTableApiAccess(null, {}, ctx)).token).toBeNull();
    const rotated = await tableApiResolvers.Mutation.rotateMyTableApiToken(null, {}, ctx);
    expect(rotated.token).toMatch(/^dtt_/);
    expect((await tableApiResolvers.Mutation.revokeMyTableApiToken(null, {}, ctx)).token).toBeNull();
  });

  it('asks for a sign-in first', () => {
    expect(() => tableApiResolvers.Query.myTableApiAccess(null, {}, makeContext(null))).toThrow(/Not authenticated/);
  });
});
