import { Types } from 'mongoose';
import type { AuthUser } from '@context';
import { UserModel } from '@modules/access/user/user.model';
import { lockAccount, unlockAccount } from '@modules/access/accountDeletion/accountDeletion.lock';
import { sealSessions } from '@modules/access/auth/session-seal';
import { ConnectionRefusedError, mcpConnectionService } from '../../auth/connections.service';
import { McpConnectionModel } from '../../auth/oauth.models';
import { sha256 } from '../../auth/tokens';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  CONNECTION_RETENTION_SECONDS,
  LAST_USED_WRITE_INTERVAL_MS,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../../mcp.constants';

/**
 * MCP connections: one per approval, holding the current access/refresh pair
 * as hashes. Everything that decides whether a token still works lives here.
 */

const PODS_RESOURCE = 'https://mcp.duncit.com/pods/mcp';
const CLIENT_ID = 'client-claude';
// RFC 5737 documentation addresses — never a real host.
const FIRST_IP = '203.0.113.7';
const SECOND_IP = '203.0.113.99';

async function seedUser(roles: string[] = ['MCP_USER']): Promise<AuthUser> {
  const email = `connections-${new Types.ObjectId().toHexString()}@duncit.com`;
  const doc = await UserModel.create({
    auth: { email },
    profile: { first_name: 'Ravi', last_name: 'Menon' },
    metadata: { role_keys: roles },
  });
  return { id: String(doc._id), email, roles };
}

function connect(user: AuthUser, over: Partial<Parameters<typeof mcpConnectionService.create>[0]> = {}) {
  return mcpConnectionService.create({
    user,
    clientId: CLIENT_ID,
    clientName: 'Claude',
    scopes: ['mcp:read', 'mcp:write'],
    resource: PODS_RESOURCE,
    meta: { ip: FIRST_IP, userAgent: 'Claude-User/1.0' },
    ...over,
  });
}

const stored = (id: string) => McpConnectionModel.findById(id).orFail().lean();

/**
 * The touch in verify() is deliberately not awaited; poll until it lands
 * (bounded by attempts, not the clock, so a mocked Date.now cannot stall it).
 */
async function waitFor<T>(read: () => PromiseLike<T>, done: (value: T) => boolean): Promise<T> {
  let value = await read();
  for (let attempt = 0; attempt < 150 && !done(value); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
    value = await read();
  }
  return value;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('mcpConnectionService.create', () => {
  it('stores only SHA-256 hashes of the pair — the raw tokens are nowhere in the document', async () => {
    const user = await seedUser();
    const before = Date.now();

    const { id, pair } = await connect(user);

    expect(pair.accessToken).toMatch(/^dmcp_at_[A-Za-z0-9_-]{43}$/);
    expect(pair.refreshToken).toMatch(/^dmcp_rt_[A-Za-z0-9_-]{43}$/);
    const doc = await stored(id);
    const everything = JSON.stringify(doc);
    expect(everything).not.toContain(pair.accessToken);
    expect(everything).not.toContain(pair.refreshToken);
    expect(everything).not.toContain(pair.accessToken.slice('dmcp_at_'.length));
    expect(everything).not.toContain(pair.refreshToken.slice('dmcp_rt_'.length));
    expect(doc.access_hash).toBe(sha256(pair.accessToken));
    expect(doc.refresh_hash).toBe(sha256(pair.refreshToken));
    expect(doc.previous_refresh_hash).toBeNull();
    expect(doc.revoked_at).toBeNull();

    // An hour for the access token, thirty days for the refresh, then ninety more days listed.
    const accessMs = doc.access_expires_at.getTime() - before;
    expect(accessMs).toBeGreaterThanOrEqual(ACCESS_TOKEN_TTL_SECONDS * 1000);
    expect(accessMs).toBeLessThan(ACCESS_TOKEN_TTL_SECONDS * 1000 + 5_000);
    const refreshMs = doc.refresh_expires_at.getTime() - before;
    expect(refreshMs).toBeGreaterThanOrEqual(REFRESH_TOKEN_TTL_SECONDS * 1000);
    expect(refreshMs).toBeLessThan(REFRESH_TOKEN_TTL_SECONDS * 1000 + 5_000);
    expect(doc.purge_at.getTime() - doc.refresh_expires_at.getTime()).toBe(CONNECTION_RETENTION_SECONDS * 1000);
    expect(Math.abs(doc.issued_at - Math.floor(before / 1000))).toBeLessThanOrEqual(1);
  });

  it('records who, which app, what scope, which connector and where from', async () => {
    const user = await seedUser();

    const { id } = await connect(user, { scopes: ['mcp:read'] });

    expect(await stored(id)).toMatchObject({
      user_email: user.email,
      client_id: CLIENT_ID,
      client_name: 'Claude',
      scopes: ['mcp:read'],
      resource: PODS_RESOURCE,
      last_ip: FIRST_IP,
      user_agent: 'Claude-User/1.0',
      last_used_at: null,
    });
    expect(String((await stored(id)).user_id)).toBe(user.id);
  });

  it('two connections never share a token', async () => {
    const user = await seedUser();
    const a = await connect(user);
    const b = await connect(user);

    expect(a.pair.accessToken).not.toBe(b.pair.accessToken);
    expect(a.pair.refreshToken).not.toBe(b.pair.refreshToken);
  });
});

describe('mcpConnectionService.verify', () => {
  it('answers a live access token with the connection and the account’s CURRENT roles', async () => {
    const user = await seedUser(['MCP_USER']);
    const { id, pair } = await connect(user);
    // A role granted after connecting is visible on the very next call.
    await UserModel.updateOne({ _id: user.id }, { $set: { 'metadata.role_keys': ['MCP_USER', 'ALL_PODS_ACCESS'] } });

    const verified = await mcpConnectionService.verify(pair.accessToken);

    const doc = await stored(id);
    expect(verified).toEqual({
      id,
      clientId: CLIENT_ID,
      clientName: 'Claude',
      scopes: ['mcp:read', 'mcp:write'],
      resource: PODS_RESOURCE,
      expiresAt: Math.floor(doc.access_expires_at.getTime() / 1000),
      user: expect.objectContaining({ id: user.id, email: user.email, roles: ['MCP_USER', 'ALL_PODS_ACCESS'] }),
    });
  });

  it('accepts a super admin, who holds every portal without the MCP role', async () => {
    const admin = await seedUser(['SUPER_ADMIN']);
    const { pair } = await connect(admin);

    await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toMatchObject({ user: { id: admin.id } });
  });

  it('refuses an unknown token, and a refresh token presented as an access token', async () => {
    const user = await seedUser();
    const { pair } = await connect(user);

    await expect(mcpConnectionService.verify('dmcp_at_never-issued')).resolves.toBeNull();
    await expect(mcpConnectionService.verify(pair.refreshToken)).resolves.toBeNull();
  });

  it('refuses an access token from the instant it expires', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);
    const expiry = Date.now() + 30_000;
    await McpConnectionModel.updateOne({ _id: id }, { $set: { access_expires_at: new Date(expiry) } });
    const clock = jest.spyOn(Date, 'now');

    clock.mockReturnValue(expiry - 1);
    await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toMatchObject({ id });
    clock.mockReturnValue(expiry);
    await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toBeNull();
  });

  it('refuses a revoked connection', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);
    await mcpConnectionService.revokeById(id, 'test revoke');

    await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toBeNull();
  });

  it('refuses a locked account while the lock stands', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);
    lockAccount(user.id);
    try {
      await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toBeNull();
    } finally {
      unlockAccount(user.id);
    }
    await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toMatchObject({ id });
  });

  it('refuses a connection approved before a password reset, but not one approved after it', async () => {
    const user = await seedUser();
    const old = await connect(user);
    sealSessions(user.id, new Date(Date.now() + 2_000));

    await expect(mcpConnectionService.verify(old.pair.accessToken)).resolves.toBeNull();

    const other = await seedUser();
    sealSessions(other.id, new Date(Date.now() - 5_000));
    const fresh = await connect(other);
    await expect(mcpConnectionService.verify(fresh.pair.accessToken)).resolves.toMatchObject({ id: fresh.id });
  });

  it('refuses the account once its MCP role is taken away, and a deleted account', async () => {
    const user = await seedUser(['MCP_USER', 'ALL_PODS_ACCESS']);
    const { pair } = await connect(user);
    await UserModel.updateOne({ _id: user.id }, { $set: { 'metadata.role_keys': ['ALL_PODS_ACCESS'] } });
    await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toBeNull();

    const deleted = await seedUser();
    const second = await connect(deleted);
    await UserModel.updateOne({ _id: deleted.id }, { $set: { 'metadata.deleted_at': new Date() } });
    await expect(mcpConnectionService.verify(second.pair.accessToken)).resolves.toBeNull();
  });

  it('writes last_used_at, the address and the agent on first use, then at most once a minute', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);
    const touch = jest.spyOn(McpConnectionModel, 'updateOne');

    await mcpConnectionService.verify(pair.accessToken, { ip: SECOND_IP, userAgent: 'ChatGPT/2' });
    expect(touch).toHaveBeenCalledTimes(1);
    const touched = await waitFor(() => stored(id), (doc) => doc.last_used_at !== null);
    expect(touched).toMatchObject({ last_ip: SECOND_IP, user_agent: 'ChatGPT/2' });
    expect(touched.last_used_at).toBeInstanceOf(Date);

    await mcpConnectionService.verify(pair.accessToken, { ip: FIRST_IP });
    expect(touch).toHaveBeenCalledTimes(1);
  });

  it('touches again only once more than LAST_USED_WRITE_INTERVAL_MS has passed', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    const touch = jest.spyOn(McpConnectionModel, 'updateOne');

    await McpConnectionModel.collection.updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: { last_used_at: new Date(now - LAST_USED_WRITE_INTERVAL_MS) } }
    );
    await mcpConnectionService.verify(pair.accessToken);
    expect(touch).not.toHaveBeenCalled();

    await McpConnectionModel.collection.updateOne(
      { _id: new Types.ObjectId(id) },
      { $set: { last_used_at: new Date(now - LAST_USED_WRITE_INTERVAL_MS - 1) } }
    );
    await mcpConnectionService.verify(pair.accessToken);
    expect(touch).toHaveBeenCalledTimes(1);
  });

  it('a touch without request details keeps the address and agent it already had', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);

    await mcpConnectionService.verify(pair.accessToken);

    const touched = await waitFor(() => stored(id), (doc) => doc.last_used_at !== null);
    expect(touched).toMatchObject({ last_ip: FIRST_IP, user_agent: 'Claude-User/1.0' });
    expect(touched.last_used_at).not.toBeNull();
  });
});

describe('mcpConnectionService.rotate', () => {
  it('swaps the refresh token for a new pair; the old pair stops working and the window slides', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);
    const before = await stored(id);

    const rotated = await mcpConnectionService.rotate(pair.refreshToken, CLIENT_ID);

    expect(rotated.scopes).toEqual(['mcp:read', 'mcp:write']);
    expect(rotated.pair.accessToken).not.toBe(pair.accessToken);
    expect(rotated.pair.refreshToken).not.toBe(pair.refreshToken);
    const after = await stored(id);
    expect(after.access_hash).toBe(sha256(rotated.pair.accessToken));
    expect(after.refresh_hash).toBe(sha256(rotated.pair.refreshToken));
    expect(after.previous_refresh_hash).toBe(sha256(pair.refreshToken));
    expect(after.refresh_expires_at.getTime()).toBeGreaterThanOrEqual(before.refresh_expires_at.getTime());
    // Approval time is what a password reset is compared with — a refresh does not move it.
    expect(after.issued_at).toBe(before.issued_at);

    await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toBeNull();
    await expect(mcpConnectionService.verify(rotated.pair.accessToken)).resolves.toMatchObject({ id });
  });

  it('a replayed (already swapped) refresh token ends the whole connection', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);
    const next = await mcpConnectionService.rotate(pair.refreshToken, CLIENT_ID);

    await expect(mcpConnectionService.rotate(pair.refreshToken, CLIENT_ID)).rejects.toThrow(
      new ConnectionRefusedError('Unknown refresh token')
    );

    expect(await stored(id)).toMatchObject({ revoked_reason: 'refresh token replayed' });
    expect((await stored(id)).revoked_at).toBeInstanceOf(Date);
    await expect(mcpConnectionService.verify(next.pair.accessToken)).resolves.toBeNull();
    await expect(mcpConnectionService.rotate(next.pair.refreshToken, CLIENT_ID)).rejects.toThrow(
      'This connection has ended — connect again'
    );
  });

  it('refuses a refresh token from another client and leaves the connection alone', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);

    await expect(mcpConnectionService.rotate(pair.refreshToken, 'client-someone-else')).rejects.toThrow(
      'Refresh token was issued to another client'
    );

    expect((await stored(id)).revoked_at).toBeNull();
    await expect(mcpConnectionService.rotate(pair.refreshToken, CLIENT_ID)).resolves.toMatchObject({
      scopes: ['mcp:read', 'mcp:write'],
    });
  });

  it('refuses an expired refresh token and a revoked connection', async () => {
    const user = await seedUser();
    const expired = await connect(user);
    await McpConnectionModel.updateOne({ _id: expired.id }, { $set: { refresh_expires_at: new Date(Date.now() - 1) } });
    await expect(mcpConnectionService.rotate(expired.pair.refreshToken, CLIENT_ID)).rejects.toThrow(
      'This connection has ended — connect again'
    );

    const revoked = await connect(user);
    await mcpConnectionService.revokeById(revoked.id, 'owner revoked');
    await expect(mcpConnectionService.rotate(revoked.pair.refreshToken, CLIENT_ID)).rejects.toThrow(
      'This connection has ended — connect again'
    );
  });

  it('refuses an account that may no longer use MCP, without issuing anything', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);
    const before = await stored(id);
    await UserModel.updateOne({ _id: user.id }, { $set: { 'metadata.role_keys': [] } });

    await expect(mcpConnectionService.rotate(pair.refreshToken, CLIENT_ID)).rejects.toThrow(
      'This account can no longer use MCP'
    );
    expect((await stored(id)).refresh_hash).toBe(before.refresh_hash);
  });

  it('an unknown refresh token is refused and revokes nothing', async () => {
    const user = await seedUser();
    const { id } = await connect(user);

    await expect(mcpConnectionService.rotate('dmcp_rt_made-up', CLIENT_ID)).rejects.toBeInstanceOf(ConnectionRefusedError);
    expect((await stored(id)).revoked_at).toBeNull();
  });

  it('two refreshes of the same token racing each other: exactly one wins', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);

    const results = await Promise.allSettled([
      mcpConnectionService.rotate(pair.refreshToken, CLIENT_ID),
      mcpConnectionService.rotate(pair.refreshToken, CLIENT_ID),
    ]);

    const won = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []));
    const lost = results.flatMap((result) => (result.status === 'rejected' ? [result.reason as unknown] : []));
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(1);
    expect(lost[0]).toBeInstanceOf(ConnectionRefusedError);
    const doc = await stored(id);
    expect(doc.refresh_hash).toBe(sha256(won[0].pair.refreshToken));
    expect(doc.previous_refresh_hash).toBe(sha256(pair.refreshToken));
  });
});

describe('mcpConnectionService.revokeByToken (RFC 7009)', () => {
  it('revoking the access token ends the connection', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);

    await mcpConnectionService.revokeByToken(pair.accessToken, CLIENT_ID);

    expect(await stored(id)).toMatchObject({ revoked_reason: 'revoked by the client' });
    await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toBeNull();
  });

  it('revoking the refresh token ends the connection too', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);

    await mcpConnectionService.revokeByToken(pair.refreshToken, CLIENT_ID);

    expect((await stored(id)).revoked_at).toBeInstanceOf(Date);
    await expect(mcpConnectionService.rotate(pair.refreshToken, CLIENT_ID)).rejects.toThrow('connection has ended');
  });

  it('is a no-op for an unknown token and for another client’s token', async () => {
    const user = await seedUser();
    const { id, pair } = await connect(user);

    await expect(mcpConnectionService.revokeByToken('dmcp_at_unknown', CLIENT_ID)).resolves.toBeUndefined();
    await expect(mcpConnectionService.revokeByToken(pair.accessToken, 'client-someone-else')).resolves.toBeUndefined();

    expect((await stored(id)).revoked_at).toBeNull();
    await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toMatchObject({ id });
  });
});

describe('mcpConnectionService.revoke (from the console)', () => {
  it('lets the owner end their own connection', async () => {
    const owner = await seedUser();
    const { id } = await connect(owner);

    const revoked = await mcpConnectionService.revoke(id, owner);

    expect(revoked).toMatchObject({ id, status: 'REVOKED', revoked_reason: 'revoked by its owner' });
    expect(revoked.revoked_at).toEqual(expect.any(String));
  });

  it('answers NOT_FOUND to another user, and the connection keeps working', async () => {
    const owner = await seedUser();
    const stranger = await seedUser();
    const { id, pair } = await connect(owner);

    await expect(mcpConnectionService.revoke(id, stranger)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });

    expect((await stored(id)).revoked_at).toBeNull();
    await expect(mcpConnectionService.verify(pair.accessToken)).resolves.toMatchObject({ id });
  });

  it('lets an MCP manager end anyone’s connection, naming the manager in the reason', async () => {
    const owner = await seedUser();
    const manager = await seedUser(['MCP_MANAGER']);
    const { id } = await connect(owner);

    await expect(mcpConnectionService.revoke(id, manager)).resolves.toMatchObject({
      status: 'REVOKED',
      revoked_reason: `revoked by ${manager.email}`,
    });
  });

  it('names a manager with no email by id', async () => {
    const owner = await seedUser();
    const { id } = await connect(owner);
    const manager: AuthUser = { id: new Types.ObjectId().toHexString(), email: null, roles: ['SUPER_ADMIN'] };

    await expect(mcpConnectionService.revoke(id, manager)).resolves.toMatchObject({
      revoked_reason: `revoked by ${manager.id}`,
    });
  });

  it('revoking twice keeps the first time and reason', async () => {
    const owner = await seedUser();
    const manager = await seedUser(['MCP_MANAGER']);
    const { id } = await connect(owner);
    const first = await mcpConnectionService.revoke(id, owner);

    const second = await mcpConnectionService.revoke(id, manager);

    expect(second.revoked_at).toBe(first.revoked_at);
    expect(second.revoked_reason).toBe('revoked by its owner');
  });

  it('refuses an id that is not an ObjectId', async () => {
    const owner = await seedUser();
    await expect(mcpConnectionService.revoke('nope', owner)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
  });
});

describe('mcpConnectionService.table and listForUser', () => {
  async function seedThree() {
    const asha = await seedUser();
    const vikram = await seedUser();
    const a1 = await connect(asha, { clientName: 'Claude' });
    const a2 = await connect(asha, { clientName: 'Gemini CLI', clientId: 'client-gemini' });
    const v1 = await connect(vikram, { clientName: 'ChatGPT', clientId: 'client-chatgpt' });
    return { asha, vikram, a1, a2, v1 };
  }

  it('an MCP manager sees every connection; anyone else only their own', async () => {
    const { asha, vikram } = await seedThree();
    const manager: AuthUser = { id: new Types.ObjectId().toHexString(), email: 'm@duncit.com', roles: ['MCP_MANAGER'] };

    const all = await mcpConnectionService.table(manager, {});
    const mine = await mcpConnectionService.table(asha, {});

    expect(all.total).toBe(3);
    expect(mine.total).toBe(2);
    expect(mine.rows.every((row) => row.user_id === asha.id)).toBe(true);
    expect((await mcpConnectionService.table(vikram, {})).rows.map((row) => row.client_name)).toEqual(['ChatGPT']);
  });

  it('a filter can narrow the owner scope but never widen it', async () => {
    const { asha, vikram } = await seedThree();

    const narrowed = await mcpConnectionService.table(asha, { search: 'gemini' });
    const widened = await mcpConnectionService.table(asha, {
      filters: [{ field: 'user_email', op: 'eq', value: vikram.email ?? '' }],
    });

    expect(narrowed.rows.map((row) => row.client_name)).toEqual(['Gemini CLI']);
    expect(widened.total).toBe(0);
  });

  it('reports each row as ACTIVE, REVOKED or EXPIRED, without any token material', async () => {
    const { asha, a1, a2 } = await seedThree();
    await mcpConnectionService.revokeById(a1.id, 'done');
    await McpConnectionModel.updateOne({ _id: a2.id }, { $set: { refresh_expires_at: new Date(Date.now() - 1) } });
    const third = await connect(asha, { clientName: 'VS Code', clientId: 'client-vscode' });

    const { rows } = await mcpConnectionService.table(asha, { page_size: 10 });

    const statusById = Object.fromEntries(rows.map((row) => [row.id, row.status]));
    expect(statusById).toEqual({ [a1.id]: 'REVOKED', [a2.id]: 'EXPIRED', [third.id]: 'ACTIVE' });
    for (const row of rows) expect(JSON.stringify(row)).not.toMatch(/hash/);
  });

  it('listForUser returns only that person’s connections, newest first', async () => {
    const { asha, a1, a2 } = await seedThree();
    // Same-millisecond inserts would tie; pin the order explicitly.
    await McpConnectionModel.collection.updateOne({ _id: new Types.ObjectId(a1.id) }, { $set: { created_at: new Date('2026-01-01T00:00:00Z') } });
    await McpConnectionModel.collection.updateOne({ _id: new Types.ObjectId(a2.id) }, { $set: { created_at: new Date('2026-02-01T00:00:00Z') } });

    const list = await mcpConnectionService.listForUser(asha.id);

    expect(list.map((row) => row.id)).toEqual([a2.id, a1.id]);
    expect(list[0]).toMatchObject({
      user_id: asha.id,
      user_email: asha.email,
      client_id: 'client-gemini',
      client_name: 'Gemini CLI',
      scopes: ['mcp:read', 'mcp:write'],
      resource: PODS_RESOURCE,
      status: 'ACTIVE',
      created_at: '2026-02-01T00:00:00.000Z',
      revoked_at: null,
      revoked_reason: null,
    });
  });
});
