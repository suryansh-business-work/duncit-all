/**
 * A City or Zonal Admin manages accounts below their own level, inside their
 * own place, and never the money fields — whether they click Save in the Admin
 * console or an AI tool calls updateUser / deleteUser for them.
 */
jest.mock('@utils/validate', () => ({ validate: jest.fn(async (_schema: unknown, input: unknown) => input) }));
jest.mock('../../user.service', () => ({
  userService: {
    update: jest.fn(async (id: string, input: unknown) => ({ id, ...(input as object) })),
    remove: jest.fn(async () => true),
    getById: jest.fn(),
  },
}));

import type { AuthUser, GraphQLContext } from '@context';
import { userService } from '../../user.service';
import { userResolvers } from '../../user.resolver';
import { adminRank, assertMayEditFields, assertMayManage, type EditTarget } from '../../user.edit-guard';

const service = userService as unknown as Record<'update' | 'remove' | 'getById', jest.Mock>;
const { updateUser, deleteUser } = userResolvers.Mutation;

const ACTOR_ID = '64b0000000000000000000aa';
const actor = (roles: string[], extra: Partial<AuthUser> = {}): AuthUser => ({
  id: ACTOR_ID,
  email: 'admin@example.com',
  roles,
  assigned_city: 'Pune',
  assigned_zones: ['North', 'East'],
  ...extra,
});
const ctx = (user: AuthUser) => ({ user }) as unknown as GraphQLContext;
const target = (over: Partial<EditTarget> & { city?: string | null } = {}) => ({
  user_id: 'u1',
  city: null,
  zone: null,
  roles: ['USER'],
  assigned_city: null,
  assigned_zones: [],
  host_share_pct: 0,
  host_commission_pct: 0,
  ...over,
});

const outcome = (promise: Promise<unknown>) =>
  promise.then(
    () => 'RESOLVED',
    (error: { message: string; extensions?: { code?: string } }) => `${error.extensions?.code}: ${error.message}`,
  );

const BELOW = 'FORBIDDEN: You can only manage accounts below your own admin level';

beforeEach(() => {
  jest.clearAllMocks();
  service.getById.mockResolvedValue(target());
});

describe('adminRank', () => {
  it('reads the highest admin level, case-insensitively, and 0 for everyone else', () => {
    expect(adminRank(['USER', 'zonal_admin', 'CITY_ADMIN'])).toBe(2);
    expect(adminRank(['SUPER_ADMIN'])).toBe(3);
    expect(adminRank(['USER', 'FINANCE_MANAGER'])).toBe(0);
    expect(adminRank([])).toBe(0);
  });
});

describe('updateUser — whom a City or Zonal Admin may edit', () => {
  it.each([
    ['a City Admin', ['CITY_ADMIN'], ['SUPER_ADMIN']],
    ['a City Admin', ['CITY_ADMIN'], ['USER', 'CITY_ADMIN']],
    ['a Zonal Admin', ['ZONAL_ADMIN'], ['CITY_ADMIN']],
    ['a Zonal Admin', ['ZONAL_ADMIN'], ['ZONAL_ADMIN']],
  ])('refuses %s editing an account with %j — even one with no city on record — and writes nothing', async (_who, roles, targetRoles) => {
    service.getById.mockResolvedValue(target({ roles: targetRoles }));
    expect(await outcome(updateUser(null, { user_id: 'u1', input: { email: 'mine@evil.test' } }, ctx(actor(roles))))).toBe(BELOW);
    expect(service.update).not.toHaveBeenCalled();
  });

  it.each([
    [['CITY_ADMIN'], ['USER', 'ZONAL_ADMIN']],
    [['CITY_ADMIN'], ['USER', 'HOST']],
    [['ZONAL_ADMIN'], ['USER']],
  ])('lets %j edit an account with %j', async (roles, targetRoles) => {
    service.getById.mockResolvedValue(target({ roles: targetRoles }));
    expect(await outcome(updateUser(null, { user_id: 'u1', input: { first_name: 'Riya' } }, ctx(actor(roles))))).toBe('RESOLVED');
    expect(service.update).toHaveBeenCalledTimes(1);
  });

  it('lets an admin edit their own profile', async () => {
    service.getById.mockResolvedValue(target({ user_id: ACTOR_ID, roles: ['USER', 'CITY_ADMIN'] }));
    expect(await outcome(updateUser(null, { user_id: ACTOR_ID, input: { bio: 'Hi' } }, ctx(actor(['CITY_ADMIN']))))).toBe('RESOLVED');
  });

  it('lets a Super Admin edit anyone, another Super Admin included', async () => {
    service.getById.mockResolvedValue(target({ roles: ['SUPER_ADMIN'], host_share_pct: 10 }));
    const input = { email: 'new@duncit.com', host_share_pct: 60, assigned_city: 'Delhi' };
    expect(await outcome(updateUser(null, { user_id: 'u1', input }, ctx(actor(['SUPER_ADMIN']))))).toBe('RESOLVED');
  });
});

describe('updateUser — the money fields', () => {
  it.each([['host_share_pct'], ['host_commission_pct']])('refuses a City Admin changing %s', async (field) => {
    expect(await outcome(updateUser(null, { user_id: 'u1', input: { [field]: 40 } }, ctx(actor(['CITY_ADMIN']))))).toBe(
      `FORBIDDEN: Only a Super Admin can change ${field}`,
    );
    expect(service.update).not.toHaveBeenCalled();
  });

  it('lets the stored value be re-sent unchanged', async () => {
    service.getById.mockResolvedValue(target({ host_share_pct: 40 }));
    expect(await outcome(updateUser(null, { user_id: 'u1', input: { host_share_pct: 40, host_commission_pct: 0 } }, ctx(actor(['CITY_ADMIN']))))).toBe(
      'RESOLVED',
    );
  });
});

describe('updateUser — assigned city and zones', () => {
  it('refuses an admin moving their own place', async () => {
    service.getById.mockResolvedValue(target({ user_id: ACTOR_ID, roles: ['CITY_ADMIN'], assigned_city: 'Pune' }));
    expect(await outcome(updateUser(null, { user_id: ACTOR_ID, input: { assigned_city: 'Mumbai' } }, ctx(actor(['CITY_ADMIN']))))).toBe(
      'FORBIDDEN: You cannot change your own assigned city or zones',
    );
  });

  it('lets the Admin console re-send the whole profile unchanged — blank city, same zones in any order', async () => {
    service.getById.mockResolvedValue(target({ user_id: ACTOR_ID, roles: ['ZONAL_ADMIN'], assigned_zones: ['North', 'East'] }));
    const input = { first_name: 'Asha', assigned_zones: ['East', 'North'] };
    expect(await outcome(updateUser(null, { user_id: ACTOR_ID, input }, ctx(actor(['ZONAL_ADMIN']))))).toBe('RESOLVED');
  });

  it('lets a City Admin give a member their own city, or clear it, but not another', async () => {
    const save = (assigned_city: string | null) =>
      outcome(updateUser(null, { user_id: 'u1', input: { assigned_city } }, ctx(actor(['CITY_ADMIN']))));
    expect(await save('Pune')).toBe('RESOLVED');
    service.getById.mockResolvedValue(target({ assigned_city: 'Pune' }));
    expect(await save(null)).toBe('RESOLVED');
    expect(await save('Mumbai')).toBe('FORBIDDEN: You can only assign the city you hold yourself');
  });

  it('refuses a Zonal Admin assigning any city', async () => {
    expect(await outcome(updateUser(null, { user_id: 'u1', input: { assigned_city: 'Pune' } }, ctx(actor(['ZONAL_ADMIN']))))).toBe(
      'FORBIDDEN: You can only assign the city you hold yourself',
    );
  });

  it('lets a Zonal Admin hand out only zones they hold; a City Admin any zone inside their city', async () => {
    const save = (roles: string[], zones: string[] | null) =>
      outcome(updateUser(null, { user_id: 'u1', input: { assigned_zones: zones } }, ctx(actor(roles))));
    expect(await save(['ZONAL_ADMIN'], ['North'])).toBe('RESOLVED');
    expect(await save(['ZONAL_ADMIN'], ['North', 'West'])).toBe('FORBIDDEN: You can only assign zones you hold yourself');
    expect(await save(['CITY_ADMIN'], ['West'])).toBe('RESOLVED');
    service.getById.mockResolvedValue(target({ assigned_zones: ['North'] }));
    expect(await save(['ZONAL_ADMIN'], null)).toBe('RESOLVED');
  });

  it('treats a Zonal Admin with no zones of their own as holding none', () => {
    expect(() => assertMayEditFields(actor(['ZONAL_ADMIN'], { assigned_zones: undefined }), target(), { assigned_zones: ['North'] })).toThrow(
      'You can only assign zones you hold yourself',
    );
  });
});

describe('deleteUser', () => {
  it('refuses a City Admin deleting a Super Admin or another City Admin, and removes nothing', async () => {
    for (const roles of [['SUPER_ADMIN'], ['CITY_ADMIN']]) {
      service.getById.mockResolvedValue(target({ roles }));
      expect(await outcome(deleteUser(null, { user_id: 'u1' }, ctx(actor(['CITY_ADMIN']))))).toBe(BELOW);
    }
    expect(service.remove).not.toHaveBeenCalled();
  });

  it('lets a City Admin delete a member', async () => {
    expect(await outcome(deleteUser(null, { user_id: 'u1' }, ctx(actor(['CITY_ADMIN']))))).toBe('RESOLVED');
    expect(service.remove).toHaveBeenCalledWith('u1');
  });
});

describe('assertMayManage', () => {
  it('treats a target with no roles on record as a member', () => {
    expect(() => assertMayManage(actor(['ZONAL_ADMIN']), { user_id: 'u2', roles: null })).not.toThrow();
  });
});
