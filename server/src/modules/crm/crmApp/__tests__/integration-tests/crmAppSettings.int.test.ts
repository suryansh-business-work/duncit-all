/**
 * CRM › CRM Mobile App › Settings: a CRM manager can turn the Security
 * Verification screen off for the Duncit CRM app. Off, a sign-in from that app
 * is a session at once; the CRM web portal, other consoles and a database
 * hiccup all keep the screen.
 */
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [
      key,
      typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value,
    ])
  );
});

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { decodeAuthUser, decodePendingPortalSession, type GraphQLContext } from '@context';
import { UserModel } from '@modules/access/user/user.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { userService } from '@modules/access/user/user.service';
import { CrmAppSettingsModel } from '../../crmAppSettings.model';
import { crmAppSettingsResolvers } from '../../crmAppSettings.resolver';

const PASSWORD = 'StrongPass123';
let seq = 0;

const manager = { user: { id: 'crm-1', roles: ['CRM_MANAGER'] } } as unknown as GraphQLContext;
const superAdmin = { user: { id: 'root-1', roles: ['SUPER_ADMIN'] } } as unknown as GraphQLContext;
const member = { user: { id: 'u-1', roles: ['USER'] } } as unknown as GraphQLContext;
const signedOut = { user: null } as unknown as GraphQLContext;

const read = async (ctx: GraphQLContext) => crmAppSettingsResolvers.Query.crmAppSettings(undefined, undefined, ctx);
const save = async (ctx: GraphQLContext, security_verification: boolean | null) =>
  crmAppSettingsResolvers.Mutation.updateCrmAppSettings(undefined, { input: { security_verification } }, ctx);

async function accountWith(roles: string[]) {
  seq += 1;
  const email = `crm-app${seq}@example.com`;
  const doc = await UserModel.create({
    profile: { first_name: 'Ravi', last_name: 'S' },
    auth: { email, password: await bcrypt.hash(PASSWORD, 4) },
    metadata: { status: 'ACTIVE' },
  });
  for (const role of roles) {
    await UserRoleModel.create({ user_id: doc._id, role, scope: { city: null, zone: null } });
  }
  return { id: String(doc._id), email };
}

const claimsOf = (token: string) => jwt.decode(token) as { psv?: { portal: string; verified: boolean } };

/** A password sign-in as the request would make it: which console, and which client sent it. */
const signInFrom = (email: string, portal_key: string, app?: string) =>
  userService.login({ email, password: PASSWORD, portal_key } as never, { app });

describe('the CRM app settings', () => {
  it('ask for Security Verification until somebody turns it off', async () => {
    await expect(read(manager)).resolves.toEqual({ security_verification: true });
  });

  it('save the switch, remember who turned it which way, and read back what was saved', async () => {
    const off = await save(manager, false);

    expect(off).toEqual({ security_verification: false });
    expect(await CrmAppSettingsModel.findOne({ key: 'default' }).lean()).toMatchObject({
      security_verification: false,
      updated_by: 'crm-1',
    });

    await expect(save(superAdmin, true)).resolves.toMatchObject({ security_verification: true });
    await expect(read(manager)).resolves.toMatchObject({ security_verification: true });
    expect(await CrmAppSettingsModel.countDocuments()).toBe(1);
    expect(await CrmAppSettingsModel.findOne({ key: 'default' }).lean()).toMatchObject({ updated_by: 'root-1' });
  });

  it('are closed to anyone who is not a CRM manager, and a refused save changes nothing', async () => {
    await expect(read(member)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(save(member, false)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(read(signedOut)).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });

    expect(await CrmAppSettingsModel.countDocuments()).toBe(0);
    await expect(read(manager)).resolves.toMatchObject({ security_verification: true });
  });

  it('refuse a save that says neither on nor off', async () => {
    await expect(save(manager, null)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(await CrmAppSettingsModel.countDocuments()).toBe(0);
  });
});

describe('a sign-in from the Duncit CRM app', () => {
  it('owes the Security Verification screen while the setting is on', async () => {
    const { email } = await accountWith(['CRM_MANAGER']);

    const result = await signInFrom(email, 'crm', 'crm-app');

    expect(claimsOf(result.token).psv).toEqual({ portal: 'crm', verified: false });
    expect(decodeAuthUser(`Bearer ${result.token}`)).toBeNull();
  });

  it('is a session straight away once a CRM manager turns the screen off', async () => {
    const { id, email } = await accountWith(['CRM_MANAGER']);
    await save(manager, false);

    const result = await signInFrom(email, 'crm', 'crm-app');

    expect(claimsOf(result.token).psv).toBeUndefined();
    expect(decodeAuthUser(`Bearer ${result.token}`)).toMatchObject({ id });
    expect(decodePendingPortalSession(`Bearer ${result.token}`)).toBeNull();
  });

  it.each([
    ['the CRM web portal', 'crm', 'crm'],
    ['a client that names no app', 'crm', undefined],
    ['the CRM app signing in to another console', 'tech', 'crm-app'],
  ])('still owes the screen for %s while it is off', async (_name, portal, app) => {
    const { email } = await accountWith(['CRM_MANAGER', 'TECH_MANAGER']);
    await save(manager, false);

    const result = await signInFrom(email, portal, app);

    expect(claimsOf(result.token).psv).toEqual({ portal, verified: false });
  });

  it('keeps the screen when the setting cannot be read', async () => {
    const { email } = await accountWith(['CRM_MANAGER']);
    await save(manager, false);
    const findOne = jest.spyOn(CrmAppSettingsModel, 'findOne').mockReturnValueOnce({
      lean: () => Promise.reject(new Error('connection reset')),
    } as never);

    const result = await signInFrom(email, 'crm', 'crm-app');

    expect(findOne).toHaveBeenCalled();
    expect(claimsOf(result.token).psv).toEqual({ portal: 'crm', verified: false });
    findOne.mockRestore();
  });

  it('is still refused, with no token at all, for an account without a CRM role', async () => {
    const { email } = await accountWith([]);
    await save(manager, false);

    await expect(signInFrom(email, 'crm', 'crm-app')).rejects.toThrow(/do not have access to this portal/i);
  });
});
