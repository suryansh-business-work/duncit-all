/**
 * SB-02: a role taken away stops working on the member's NEXT request, with the
 * token they already hold, and nothing else they hold stops with it.
 *
 * Real database, real role writes (user.roles), the real GraphQL context
 * decode. Redis is replaced by an in-memory map with the same get/set/del
 * contract, so the test also proves the cached role set is dropped by the
 * write rather than merely outlived.
 */
const mockCache = new Map<string, unknown>();
jest.mock('@config/redis', () => ({
  ...jest.requireActual('@config/redis'),
  cacheGet: jest.fn(async (key: string) => mockCache.get(key) ?? null),
  cacheSet: jest.fn(async (key: string, value: unknown) => {
    mockCache.set(key, value);
  }),
  cacheDel: jest.fn(async (key: string) => {
    mockCache.delete(key);
  }),
}));
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [
      key,
      typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value,
    ]),
  );
});

import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { resolveAuthUser, type GraphQLContext } from '@context';
import { requireRole } from '@middleware/rbac';
import { logs } from '@observability/log';
import { userService } from '@modules/access/user/user.service';
import { UserModel } from '@modules/access/user/user.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { sessionsWithoutTransactions } from '@modules/access/user/__tests__/integration-tests/standaloneSessions.fixture';

const CITY_GATE = ['CITY_ADMIN'];
const FINANCE_GATE = ['FINANCE_MANAGER'];
/** A City Admin always administers a city: the role row is refused without one. */
const CITY = 'Pune';

let seq = 0;
async function makeStaff(roleKeys: string[]) {
  seq += 1;
  const doc = await UserModel.create({
    profile: { first_name: 'Staff', assigned_city: CITY },
    auth: { email: `current-roles-${seq}@example.com` },
    metadata: { status: 'ACTIVE', role_keys: roleKeys },
  });
  await UserRoleModel.insertMany(
    roleKeys.map((role) => ({
      user_id: doc._id,
      role,
      scope: { city: role === 'CITY_ADMIN' ? CITY : null, zone: null },
    })),
  );
  return String(doc._id);
}

/** A session token exactly as sign-in mints one: the roles held at that moment. */
const tokenFor = (id: string, roles: string[]) =>
  `Bearer ${jwt.sign({ id, email: null, roles }, process.env.JWT_SECRET || 'dev-secret')}`;

/** The context a GraphQL request carrying this header is answered with. */
async function contextFor(header: string): Promise<GraphQLContext> {
  return { user: await resolveAuthUser(header) } as GraphQLContext;
}

function refusalOf(run: () => unknown) {
  try {
    run();
  } catch (error) {
    const refused = error as { message: string; extensions?: { code?: string } };
    return { code: refused.extensions?.code, message: refused.message };
  }
  throw new Error('Expected the gate to refuse');
}

let sessions: jest.SpyInstance;
beforeAll(() => {
  sessions = sessionsWithoutTransactions();
});
afterAll(() => sessions.mockRestore());

beforeEach(() => {
  mockCache.clear();
});

describe('roles on a session token that never expires', () => {
  it('refuses a revoked role on the next request with the old token, and keeps every other access', async () => {
    const id = await makeStaff(['USER', 'CITY_ADMIN', 'FINANCE_MANAGER']);
    const header = tokenFor(id, ['USER', 'CITY_ADMIN', 'FINANCE_MANAGER']);

    const before = await contextFor(header);
    expect(requireRole(before, CITY_GATE).id).toBe(id);
    expect(mockCache.get(`auth:roles:${id}`)).toEqual(expect.arrayContaining(['CITY_ADMIN']));

    await userService.removeRole(id, 'CITY_ADMIN');
    // The write dropped the cached set; the next request reads the new one.
    expect(mockCache.has(`auth:roles:${id}`)).toBe(false);

    const after = await contextFor(header);
    // Still signed in, as the same person…
    expect(after.user?.id).toBe(id);
    expect(after.user?.roles).toEqual(['USER', 'FINANCE_MANAGER']);
    // …refused only what the revoked role allowed.
    expect(refusalOf(() => requireRole(after, CITY_GATE))).toEqual({ code: 'FORBIDDEN', message: 'Access Denied' });
    expect(requireRole(after, FINANCE_GATE).id).toBe(id);
  });

  it('never grants a role the token does not carry: a new role still needs a fresh sign-in', async () => {
    const id = await makeStaff(['USER', 'FINANCE_MANAGER']);
    const header = tokenFor(id, ['USER', 'FINANCE_MANAGER']);

    await userService.addRole(id, 'SUPER_ADMIN');

    const ctx = await contextFor(header);
    expect(ctx.user?.roles).toEqual(['USER', 'FINANCE_MANAGER']);
    expect(refusalOf(() => requireRole(ctx, ['SUPER_ADMIN']))).toEqual({ code: 'FORBIDDEN', message: 'Access Denied' });
    // A token minted after the grant carries it, as it always did.
    const fresh = await contextFor(tokenFor(id, ['USER', 'FINANCE_MANAGER', 'SUPER_ADMIN']));
    expect(requireRole(fresh, ['SUPER_ADMIN']).id).toBe(id);
  });

  it('serves a repeat request from the cached set with no database read', async () => {
    const id = await makeStaff(['USER', 'CITY_ADMIN']);
    const header = tokenFor(id, ['USER', 'CITY_ADMIN']);
    await contextFor(header);
    const reads = jest.spyOn(UserRoleModel, 'find');

    expect((await contextFor(header)).user?.roles).toEqual(['USER', 'CITY_ADMIN']);
    expect(reads).not.toHaveBeenCalled();
    reads.mockRestore();
  });

  it('reads nothing for a member token: there is no staff access to take back', async () => {
    const id = await makeStaff(['USER']);
    const reads = jest.spyOn(UserRoleModel, 'find');

    expect((await contextFor(tokenFor(id, ['USER']))).user?.roles).toEqual(['USER']);
    expect(reads).not.toHaveBeenCalled();
    reads.mockRestore();
  });

  it('holds no roles for an account that no longer exists', async () => {
    const gone = new Types.ObjectId().toHexString();
    const ctx = await contextFor(tokenFor(gone, ['USER', 'SUPER_ADMIN']));
    expect(ctx.user?.roles).toEqual([]);
    expect(refusalOf(() => requireRole(ctx, ['SUPER_ADMIN']))).toEqual({ code: 'FORBIDDEN', message: 'Access Denied' });
  });

  it('keeps the token roles for that request when the role read fails, and logs it', async () => {
    const id = await makeStaff(['USER', 'CITY_ADMIN']);
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);
    const reads = jest.spyOn(UserRoleModel, 'find').mockImplementationOnce(() => {
      throw new Error('mongo blinked');
    });

    expect((await contextFor(tokenFor(id, ['USER', 'CITY_ADMIN']))).user?.roles).toEqual(['USER', 'CITY_ADMIN']);
    expect(warn).toHaveBeenCalledWith('auth', 'current-roles', expect.objectContaining({ userId: id }));
    // Nothing was cached from the failed read, so the next request tries again.
    expect(mockCache.has(`auth:roles:${id}`)).toBe(false);
    reads.mockRestore();
    warn.mockRestore();
  });

  it('answers a missing or forged header with no user at all', async () => {
    expect(await resolveAuthUser(undefined)).toBeNull();
    expect(await resolveAuthUser('Bearer not-a-token')).toBeNull();
  });
});
