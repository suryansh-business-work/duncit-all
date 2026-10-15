/**
 * createUser / updateUser carry a `roles` field. Assigning roles is a Super
 * Admin's (ROLE_ASSIGNERS, as assignUserRoles), so a City or Zonal Admin may
 * create plain members and edit users, but never hand out or change roles.
 *
 * Validation is passed through (its own tests cover it) so these cases test the
 * role rule alone; the service is mocked so nothing is written.
 */
jest.mock('@utils/validate', () => ({ validate: jest.fn(async (_schema: unknown, input: unknown) => input) }));
jest.mock('../../user.service', () => ({
  userService: {
    create: jest.fn(async (input: unknown) => ({ id: 'new', ...(input as object) })),
    update: jest.fn(async (id: string, input: unknown) => ({ id, ...(input as object) })),
    getById: jest.fn(),
  },
}));

import type { GraphQLContext } from '@context';
import { userService } from '../../user.service';
import { userResolvers } from '../../user.resolver';

const service = userService as unknown as Record<'create' | 'update' | 'getById', jest.Mock>;
const { createUser, updateUser } = userResolvers.Mutation;

const as = (roles: string[]) =>
  ({ user: { id: '64b0000000000000000000aa', email: 'a@example.com', roles, assigned_city: 'Pune', assigned_zones: ['North'] } }) as unknown as GraphQLContext;

const refusal = (promise: Promise<unknown>) =>
  promise.then(
    () => 'RESOLVED',
    (error: { message: string; extensions?: { code?: string } }) => `${error.extensions?.code}: ${error.message}`,
  );

const REFUSED = 'FORBIDDEN: Only a Super Admin can assign roles';

beforeEach(() => {
  jest.clearAllMocks();
  service.getById.mockResolvedValue({ id: 'u1', city: 'Pune', zone: 'North', roles: ['USER', 'HOST'] });
});

describe('createUser roles', () => {
  it('lets a City Admin create a plain member', async () => {
    expect(await refusal(createUser(null, { input: { city: 'Pune', roles: ['USER'] } }, as(['CITY_ADMIN'])))).toBe(
      'RESOLVED',
    );
    expect(service.create).toHaveBeenCalledTimes(1);
  });

  it.each([['TECH_MANAGER'], ['FINANCE_MANAGER'], ['SUPER_ADMIN'], ['CITY_ADMIN']])(
    'refuses a City Admin creating a user with %s, and creates nothing',
    async (role) => {
      expect(await refusal(createUser(null, { input: { city: 'Pune', roles: ['USER', role] } }, as(['CITY_ADMIN'])))).toBe(
        REFUSED,
      );
      expect(service.create).not.toHaveBeenCalled();
    },
  );

  it('lets a Super Admin create a user with any roles', async () => {
    expect(
      await refusal(createUser(null, { input: { city: 'Delhi', roles: ['USER', 'TECH_MANAGER'] } }, as(['SUPER_ADMIN']))),
    ).toBe('RESOLVED');
  });
});

describe('updateUser roles', () => {
  it('lets a City Admin edit a user without touching roles, or sending them back unchanged', async () => {
    expect(await refusal(updateUser(null, { user_id: 'u1', input: { first_name: 'Riya' } }, as(['CITY_ADMIN'])))).toBe(
      'RESOLVED',
    );
    expect(
      await refusal(updateUser(null, { user_id: 'u1', input: { roles: ['host', 'USER'] } }, as(['CITY_ADMIN']))),
    ).toBe('RESOLVED');
  });

  it('refuses a City Admin adding or removing a role, and updates nothing', async () => {
    expect(
      await refusal(updateUser(null, { user_id: 'u1', input: { roles: ['USER', 'HOST', 'FINANCE_MANAGER'] } }, as(['CITY_ADMIN']))),
    ).toBe(REFUSED);
    expect(await refusal(updateUser(null, { user_id: 'u1', input: { roles: ['USER'] } }, as(['ZONAL_ADMIN'])))).toBe(
      REFUSED,
    );
    expect(service.update).not.toHaveBeenCalled();
  });

  it('lets a Super Admin change roles', async () => {
    expect(
      await refusal(updateUser(null, { user_id: 'u1', input: { roles: ['USER', 'TECH_MANAGER'] } }, as(['SUPER_ADMIN']))),
    ).toBe('RESOLVED');
  });
});
