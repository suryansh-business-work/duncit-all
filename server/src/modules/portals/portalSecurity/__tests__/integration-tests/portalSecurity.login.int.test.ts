/**
 * What a sign-in hands back, as far as Security Verification is concerned: a
 * console sign-in comes back as a token that is not yet a session, every other
 * sign-in comes back untouched, and a console the account has no role for is
 * refused before any token exists.
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
import { decodeAuthUser, decodePendingPortalSession } from '@context';
import { UserModel } from '@modules/access/user/user.model';
import { UserRoleModel } from '@modules/access/user/relations';
import { userService } from '@modules/access/user/user.service';

const PASSWORD = 'StrongPass123';
let seq = 0;

async function accountWith(roles: string[]) {
  seq += 1;
  const email = `console${seq}@example.com`;
  const doc = await UserModel.create({
    profile: { first_name: 'Asha', last_name: 'K' },
    auth: { email, password: await bcrypt.hash(PASSWORD, 4) },
    metadata: { status: 'ACTIVE' },
  });
  for (const role of roles) {
    await UserRoleModel.create({ user_id: doc._id, role, scope: { city: null, zone: null } });
  }
  return { id: String(doc._id), email };
}

const claimsOf = (token: string) => jwt.decode(token) as { id: string; psv?: { portal: string; verified: boolean } };

describe('a console sign-in', () => {
  it('comes back as a token that is not a session until the screen is completed', async () => {
    const { id, email } = await accountWith(['TECH_MANAGER']);

    const result = await userService.login({ email, password: PASSWORD, portal_key: 'tech' } as never);

    expect(claimsOf(result.token).psv).toEqual({ portal: 'tech', verified: false });
    const header = `Bearer ${result.token}`;
    // Every request carrying it reads as signed out…
    expect(decodeAuthUser(header)).toBeNull();
    // …except for the screen, which is told whose it is and which console it is for.
    expect(decodePendingPortalSession(header)).toMatchObject({ userId: id, portal: 'tech', reverify: false });
    // The sign-in answer itself is unchanged: the console still reads who signed in and with which roles.
    expect(result.user.roles).toContain('TECH_MANAGER');
  });

  it('is minted for the console that was asked for, not for another', async () => {
    const { email } = await accountWith(['SUPER_ADMIN']);

    const finance = await userService.login({ email, password: PASSWORD, portal_key: 'finance' } as never);
    const hr = await userService.login({ email, password: PASSWORD, portal_key: 'hr' } as never);

    expect(claimsOf(finance.token).psv?.portal).toBe('finance');
    expect(claimsOf(hr.token).psv?.portal).toBe('hr');
  });

  it.each([
    ['no portal at all', undefined],
    ['mWeb', 'mweb'],
    ['the native app', 'native'],
    ['the Partner portal', 'partners'],
  ])('is not asked of a sign-in for %s', async (_name, portal_key) => {
    const { id, email } = await accountWith(['TECH_MANAGER']);

    const result = await userService.login({ email, password: PASSWORD, portal_key } as never);

    expect(claimsOf(result.token).psv).toBeUndefined();
    expect(decodeAuthUser(`Bearer ${result.token}`)).toMatchObject({ id });
    expect(decodePendingPortalSession(`Bearer ${result.token}`)).toBeNull();
  });

  it('is refused, with no token at all, for a console the account holds no role for', async () => {
    const { email } = await accountWith([]);

    await expect(userService.login({ email, password: PASSWORD, portal_key: 'tech' } as never)).rejects.toThrow(
      /do not have access to this portal/i
    );
  });
});
