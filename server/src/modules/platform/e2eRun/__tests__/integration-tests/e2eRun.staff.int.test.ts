/**
 * Roles for the e2e run account, against a real database: granted and revoked
 * only for this run's address, only from the run-account list, and only while
 * "one-time codes for the run account" declares the database an e2e target.
 *
 * The overrides switch is mocked (it is a cached settings read); the user,
 * role and audit writes are the real ones.
 */
const mockOverrides = { muted: true, otpBypass: true, account: { email: /^qa\+\d{12}(-[a-z0-9-]+)?@duncit\.com$/ } };
jest.mock('../../e2eRun.mute', () => ({
  ...jest.requireActual('../../e2eRun.mute'),
  e2eOverrides: jest.fn(async () => mockOverrides),
}));

import { UserModel } from '@modules/access/user/user.model';
import { grantRunAccountRoles, revokeRunAccountRoles } from '../../e2eRun.staff';

const STAMP = '141020260300';
const RUN_EMAIL = `qa+${STAMP}@duncit.com`;

const roleKeys = async (email: string): Promise<string[]> => {
  const user = await UserModel.findOne({ 'auth.email': email }).lean();
  return [...(user?.metadata?.role_keys ?? [])].sort((a, b) => a.localeCompare(b));
};

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => 'RESOLVED',
    (error: { extensions?: { code?: string } }) => error.extensions?.code,
  );

beforeEach(async () => {
  mockOverrides.otpBypass = true;
  await UserModel.create({
    auth: { email: RUN_EMAIL },
    profile: { first_name: 'Run', last_name: 'Account' },
    metadata: { role_keys: ['USER'] },
  });
});

afterEach(async () => {
  await UserModel.deleteMany({ 'auth.email': RUN_EMAIL });
});

describe('grantRunAccountRoles / revokeRunAccountRoles', () => {
  it('grants limited staff and partner roles, then revokes one and keeps the rest', async () => {
    const granted = await grantRunAccountRoles({ stamp: STAMP, email: RUN_EMAIL, roles: ['city_admin', 'FINANCE_USER'] });
    expect(granted).toEqual(expect.arrayContaining(['CITY_ADMIN', 'FINANCE_USER']));
    expect(await roleKeys(RUN_EMAIL)).toEqual(['CITY_ADMIN', 'FINANCE_USER', 'USER']);

    const left = await revokeRunAccountRoles({ stamp: STAMP, email: RUN_EMAIL, roles: ['FINANCE_USER'] });
    expect(left).not.toContain('FINANCE_USER');
    expect(await roleKeys(RUN_EMAIL)).toEqual(['CITY_ADMIN', 'USER']);
  });

  it('gives CITY_ADMIN the city asked for, and takes it away with the role', async () => {
    await grantRunAccountRoles({ stamp: STAMP, email: RUN_EMAIL, roles: ['CITY_ADMIN'], assigned_city: 'Pune' });
    expect((await UserModel.findOne({ 'auth.email': RUN_EMAIL }).lean())?.profile?.assigned_city).toBe('Pune');

    await revokeRunAccountRoles({ stamp: STAMP, email: RUN_EMAIL, roles: ['CITY_ADMIN'] });
    expect((await UserModel.findOne({ 'auth.email': RUN_EMAIL }).lean())?.profile?.assigned_city).toBeUndefined();
    expect(await roleKeys(RUN_EMAIL)).toEqual(['USER']);
  });

  it.each(['SUPER_ADMIN', 'TECH_MANAGER', 'FINANCE_MANAGER'])('never grants %s, and changes nothing', async (role) => {
    const code = await codeOf(grantRunAccountRoles({ stamp: STAMP, email: RUN_EMAIL, roles: ['CITY_ADMIN', role] }));
    expect(code).toBe('BAD_USER_INPUT');
    expect(await roleKeys(RUN_EMAIL)).toEqual(['USER']);
  });

  it('refuses an empty role list and a stamp that is not a run identity', async () => {
    expect(await codeOf(grantRunAccountRoles({ stamp: STAMP, email: RUN_EMAIL, roles: [] }))).toBe('BAD_USER_INPUT');
    expect(await codeOf(revokeRunAccountRoles({ stamp: 'not-a-stamp', email: RUN_EMAIL, roles: ['CITY_ADMIN'] }))).toBe(
      'BAD_USER_INPUT',
    );
  });

  it('refuses while one-time codes for the run account are off', async () => {
    mockOverrides.otpBypass = false;
    expect(await codeOf(grantRunAccountRoles({ stamp: STAMP, email: RUN_EMAIL, roles: ['CITY_ADMIN'] }))).toBe('FORBIDDEN');
    expect(await roleKeys(RUN_EMAIL)).toEqual(['USER']);
  });

  it('refuses an address that is not this run’s account', async () => {
    const otherRun = `qa+010120260000@duncit.com`;
    const stranger = `someone+${STAMP}@example.com`;
    expect(await codeOf(grantRunAccountRoles({ stamp: STAMP, email: otherRun, roles: ['CITY_ADMIN'] }))).toBe(
      'BAD_USER_INPUT',
    );
    expect(await codeOf(grantRunAccountRoles({ stamp: STAMP, email: stranger, roles: ['CITY_ADMIN'] }))).toBe(
      'BAD_USER_INPUT',
    );
  });

  it('answers NOT_FOUND when the run account has not been created', async () => {
    const unborn = `qa+${STAMP}-later@duncit.com`;
    expect(await codeOf(revokeRunAccountRoles({ stamp: STAMP, email: unborn, roles: ['CITY_ADMIN'] }))).toBe('NOT_FOUND');
  });
});
