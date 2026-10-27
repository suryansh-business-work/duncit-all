import { Types } from 'mongoose';
import { UserModel } from '@modules/access/user/user.model';
import { lockAccount, unlockAccount } from '@modules/access/accountDeletion/accountDeletion.lock';
import { sealSessions } from '@modules/access/auth/session-seal';
import { identityForToken } from '../../token-identity';

/**
 * identityForToken — the account behind a credential that is NOT a session JWT
 * (an MCP connection, a table API token). It must refuse exactly where a
 * session would be refused, and read the roles fresh every time.
 */

const nowSeconds = () => Math.floor(Date.now() / 1000);

async function seedUser(roles: string[] = ['MCP_USER']) {
  const email = `identity-${new Types.ObjectId().toHexString()}@duncit.com`;
  const user = await UserModel.create({
    auth: { email },
    profile: { first_name: 'Nisha', last_name: 'Kapoor', assigned_city: 'Bengaluru' },
    metadata: { role_keys: roles, assigned_zones: ['blr-east'] },
  });
  return { id: String(user._id), email };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('identityForToken', () => {
  it('returns the same identity a JWT would carry, read from the user document', async () => {
    const { id, email } = await seedUser(['MCP_USER', 'ALL_PODS_ACCESS']);

    await expect(identityForToken(id, nowSeconds())).resolves.toEqual({
      id,
      email,
      roles: ['MCP_USER', 'ALL_PODS_ACCESS'],
      assigned_city: 'Bengaluru',
      assigned_zones: ['blr-east'],
    });
  });

  it('reads the roles fresh, so a role taken away is gone from every credential at once', async () => {
    const { id } = await seedUser(['MCP_USER', 'FINANCE_MANAGER']);
    expect((await identityForToken(id, nowSeconds()))?.roles).toEqual(['MCP_USER', 'FINANCE_MANAGER']);

    await UserModel.updateOne({ _id: id }, { $set: { 'metadata.role_keys': ['MCP_USER'] } });

    expect((await identityForToken(id, nowSeconds()))?.roles).toEqual(['MCP_USER']);
  });

  it('refuses an id that is not an ObjectId without reading the database', async () => {
    const findById = jest.spyOn(UserModel, 'findById');

    await expect(identityForToken('not-an-id', nowSeconds())).resolves.toBeNull();
    await expect(identityForToken('', nowSeconds())).resolves.toBeNull();
    expect(findById).not.toHaveBeenCalled();
  });

  it('refuses an account that does not exist', async () => {
    await expect(identityForToken(new Types.ObjectId().toHexString(), nowSeconds())).resolves.toBeNull();
  });

  it('refuses a locked account, and accepts it again once the lock is lifted', async () => {
    const { id } = await seedUser();
    lockAccount(id);
    try {
      await expect(identityForToken(id, nowSeconds())).resolves.toBeNull();
    } finally {
      unlockAccount(id);
    }
    await expect(identityForToken(id, nowSeconds())).resolves.toMatchObject({ id });
  });

  it('refuses a credential issued before the last password reset, and accepts one issued at or after it', async () => {
    const { id } = await seedUser();
    // A whole second, so the seconds-vs-milliseconds boundary is exact.
    const sealedAtMs = 1_900_000_000_000;
    sealSessions(id, new Date(sealedAtMs));

    await expect(identityForToken(id, sealedAtMs / 1000 - 1)).resolves.toBeNull();
    await expect(identityForToken(id, sealedAtMs / 1000)).resolves.toMatchObject({ id });
    await expect(identityForToken(id, sealedAtMs / 1000 + 60)).resolves.toMatchObject({ id });
  });

  it('a seal on one account never refuses another', async () => {
    const sealed = await seedUser();
    const other = await seedUser();
    sealSessions(sealed.id, new Date(Date.now() + 60_000));

    await expect(identityForToken(sealed.id, nowSeconds())).resolves.toBeNull();
    await expect(identityForToken(other.id, nowSeconds())).resolves.toMatchObject({ id: other.id });
  });

  it('refuses a deleted account even though the document still exists', async () => {
    const { id } = await seedUser();
    await UserModel.updateOne({ _id: id }, { $set: { 'metadata.deleted_at': new Date() } });

    await expect(identityForToken(id, nowSeconds())).resolves.toBeNull();
  });

  it('reads a legacy account with no email, scope or role fields as a signed-in account with none', async () => {
    const { insertedId } = await UserModel.collection.insertOne({});

    await expect(identityForToken(String(insertedId), nowSeconds())).resolves.toEqual({
      id: String(insertedId),
      email: null,
      roles: [],
      assigned_city: null,
      assigned_zones: [],
    });
  });
});
