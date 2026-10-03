/**
 * Role writes (user.roles) against a real database: the authoritative
 * user_roles rows and the metadata cache they keep in step, scoped admin rows,
 * and everything that follows a change — partner welcome mail + push, the
 * Club Admin record, onboarding downgrades on revoke, and the admin-access
 * mail on both doors.
 *
 * replaceUserRoles writes inside `session.withTransaction`, which a standalone
 * mongod cannot host; the session here is real and its withTransaction simply
 * runs the work, so every write still carries the session.
 */
jest.mock('@services/email/email.service', () => {
  const actual = jest.requireActual('@services/email/email.service');
  return Object.fromEntries(
    Object.entries(actual).map(([key, value]) => [
      key,
      typeof value === 'function' ? jest.fn().mockResolvedValue(undefined) : value,
    ]),
  );
});
jest.mock('@config/url-configs', () => ({
  ...jest.requireActual('@config/url-configs'),
  getUrlConfigs: jest.fn().mockResolvedValue({ partnersUrl: 'https://partners.example.test' }),
}));

import { Types } from 'mongoose';

import { userService } from '../../user.service';
import { replaceUserRoles } from '../../user.roles';
import { UserModel } from '../../user.model';
import { UserRoleModel } from '../../relations';
import {
  sendAdminAccessGrantedEmail,
  sendAdminAccessRevokedEmail,
  sendPartnerAccessGrantedEmail,
} from '@services/email/email.service';
import { logs } from '@observability/log';
import { notificationService } from '@modules/engagement/notification/notification.service';
import { hostService } from '@modules/venues/host/host.service';
import { venueService } from '@modules/venues/venue/venue.service';
import { ecommBrandService } from '@modules/venues/ecommBrand/ecommBrand.service';
import { clubService } from '@modules/clubs/club/club.service';
import { clubAdminProfileService } from '@modules/clubs/clubAdminProfile/clubAdminProfile.service';

const partnerMail = sendPartnerAccessGrantedEmail as jest.Mock;
const adminGrantedMail = sendAdminAccessGrantedEmail as jest.Mock;
const adminRevokedMail = sendAdminAccessRevokedEmail as jest.Mock;

let seq = 0;
async function makeUser(roleKeys: string[] = ['USER'], over: Record<string, any> = {}) {
  seq += 1;
  const email = `roles${seq}@example.com`;
  const doc = await UserModel.create({
    profile: { first_name: 'Dev', ...(over.profile ?? {}) },
    auth: { email },
    metadata: { status: 'ACTIVE', role_keys: roleKeys, ...(over.metadata ?? {}) },
  });
  if (roleKeys.length) {
    await UserRoleModel.insertMany(
      roleKeys.map((role) => ({ user_id: doc._id, role, scope: { city: null, zone: null } })),
    );
  }
  return { id: String(doc._id), email };
}

const rowsOf = async (id: string) =>
  (await UserRoleModel.find({ user_id: id }).lean<any[]>()).map((r) => ({
    role: r.role,
    zone: r.scope?.zone ?? null,
    city: r.scope?.city ?? null,
  }));

let notify: jest.SpyInstance;
let hostRevoke: jest.SpyInstance;
let venueRevoke: jest.SpyInstance;
let brandRevoke: jest.SpyInstance;
let clubRevoke: jest.SpyInstance;
let ensureClubAdmin: jest.SpyInstance;
let logError: jest.SpyInstance;

beforeEach(() => {
  const realStart = UserModel.db.startSession.bind(UserModel.db);
  jest.spyOn(UserModel.db, 'startSession').mockImplementation((async (opts?: any) => {
    const session = await realStart(opts);
    (session as any).withTransaction = async (fn: (s: unknown) => Promise<unknown>) => {
      await fn(session);
    };
    return session;
  }) as any);
  notify = jest.spyOn(notificationService, 'create').mockResolvedValue(undefined as never);
  hostRevoke = jest.spyOn(hostService, 'revokeApprovalForUser').mockResolvedValue(undefined as never);
  venueRevoke = jest.spyOn(venueService, 'revokeApprovalForUser').mockResolvedValue(undefined as never);
  brandRevoke = jest.spyOn(ecommBrandService, 'revokeApprovalForUser').mockResolvedValue(undefined as never);
  clubRevoke = jest.spyOn(clubService, 'revokeAdminForUser').mockResolvedValue(undefined as never);
  ensureClubAdmin = jest.spyOn(clubAdminProfileService, 'ensureForUser').mockResolvedValue(true);
  logError = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('replaceUserRoles', () => {
  it('normalises, de-duplicates and writes one row per role plus the metadata cache', async () => {
    const { id } = await makeUser(['USER']);
    await replaceUserRoles(id, ['user', 'USER', '', 'finance_user']);
    expect(await rowsOf(id)).toEqual(
      expect.arrayContaining([
        { role: 'USER', zone: null, city: null },
        { role: 'FINANCE_USER', zone: null, city: null },
      ]),
    );
    expect(await rowsOf(id)).toHaveLength(2);
    const stored = await UserModel.findById(id).lean<any>();
    expect(stored.metadata.role_keys).toEqual(['USER', 'FINANCE_USER']);
  });

  it('writes a ZONAL_ADMIN row per assigned zone and a city-scoped CITY_ADMIN row', async () => {
    const { id } = await makeUser([]);
    const assignedBy = new Types.ObjectId().toString();
    await replaceUserRoles(id, ['ZONAL_ADMIN', 'CITY_ADMIN'], {
      assignedZones: ['zone-a', 'zone-b'],
      assignedCity: 'city-1',
      assignedBy,
    });
    const rows = await UserRoleModel.find({ user_id: id }).lean<any[]>();
    expect(rows.map((r) => [r.role, r.scope.zone, r.scope.city])).toEqual(
      expect.arrayContaining([
        ['ZONAL_ADMIN', 'zone-a', null],
        ['ZONAL_ADMIN', 'zone-b', null],
        ['CITY_ADMIN', null, 'city-1'],
      ]),
    );
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => String(r.assigned_by) === assignedBy)).toBe(true);
    const stored = await UserModel.findById(id).lean<any>();
    expect(stored.metadata.assigned_zones).toEqual(['zone-a', 'zone-b']);
    expect(stored.profile.assigned_city).toBe('city-1');
  });

  it.each([
    ['ZONAL_ADMIN', 'ZONAL_ADMIN role requires scope.zone'],
    ['CITY_ADMIN', 'CITY_ADMIN role requires scope.city'],
  ])('refuses %s with no zone or city to scope it to', async (role, message) => {
    const { id } = await makeUser([]);
    await expect(replaceUserRoles(id, [role])).rejects.toThrow(message);
    // The metadata cache is written after the rows, so a refused write leaves it untouched.
    expect((await UserModel.findById(id).lean<any>()).metadata.role_keys).toEqual([]);
  });

  it('clears every row for an empty role set', async () => {
    const { id } = await makeUser(['USER', 'FINANCE_USER']);
    await replaceUserRoles(id, []);
    expect(await rowsOf(id)).toEqual([]);
    expect((await UserModel.findById(id).lean<any>()).metadata.role_keys).toEqual([]);
  });
});

describe('partner access on grant', () => {
  it('mails and pushes each freshly granted partner role, and nothing for a non-partner role', async () => {
    const { id, email } = await makeUser(['USER']);
    await userService.assignRoles(id, ['USER', 'HOST', 'VENUE_OWNER', 'FINANCE_USER']);

    expect(partnerMail).toHaveBeenCalledTimes(2);
    expect(partnerMail).toHaveBeenCalledWith({
      to: email,
      name: 'Dev',
      partner_type: 'Host',
      portal_url: 'https://partners.example.test',
    });
    expect(partnerMail).toHaveBeenCalledWith(expect.objectContaining({ partner_type: 'Venue Partner' }));
    expect(notify).toHaveBeenCalledTimes(2);
    expect(notify).toHaveBeenCalledWith(
      expect.objectContaining({ scope: 'USER', target_user_ids: [id], silent: false }),
    );
  });

  it('logs a failed partner mail without failing the role write', async () => {
    const { id } = await makeUser(['USER']);
    partnerMail.mockRejectedValueOnce(new Error('smtp down'));
    const res = await userService.addRole(id, 'ecomm_manager');
    expect(res?.roles).toEqual(expect.arrayContaining(['USER', 'ECOMM_MANAGER']));
    await new Promise((r) => setImmediate(r));
    expect(logError).toHaveBeenCalledWith(
      'user.roles',
      'notifyPartnerAccessGranted',
      expect.objectContaining({ msg: 'partner access email failed', role: 'ECOMM_MANAGER' }),
    );
  });

  it('logs a failed push without failing the role write', async () => {
    const { id } = await makeUser(['USER']);
    notify.mockRejectedValueOnce(new Error('push down'));
    await userService.addRole(id, 'HOST');
    expect((await UserModel.findById(id).lean<any>()).metadata.role_keys).toContain('HOST');
    expect(logError).toHaveBeenCalledWith(
      'user.roles',
      'notifyPartnerAccessGranted',
      expect.objectContaining({ msg: 'partner access notify failed', userId: id }),
    );
  });

  it('does not re-announce a partner role the user already held', async () => {
    const { id } = await makeUser(['USER', 'HOST']);
    await userService.addRole(id, 'FINANCE_USER');
    expect(partnerMail).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('drafts the Club Admin record before announcing a granted CLUB_ADMIN', async () => {
    const { id } = await makeUser(['USER']);
    await userService.addRole(id, 'CLUB_ADMIN');
    expect(ensureClubAdmin).toHaveBeenCalledWith(id);
    expect(ensureClubAdmin.mock.invocationCallOrder[0]).toBeLessThan(notify.mock.invocationCallOrder[0]);
    expect(partnerMail).toHaveBeenCalledWith(expect.objectContaining({ partner_type: 'Club Admin' }));
  });

  it('logs a Club Admin record failure and still grants the role', async () => {
    const { id } = await makeUser(['USER']);
    ensureClubAdmin.mockRejectedValueOnce(new Error('db hiccup'));
    await userService.addRole(id, 'CLUB_ADMIN');
    expect((await UserModel.findById(id).lean<any>()).metadata.role_keys).toContain('CLUB_ADMIN');
    expect(logError).toHaveBeenCalledWith(
      'user.replaceUserRoles',
      'syncGrantedOnboarding',
      expect.objectContaining({ userId: id }),
    );
  });
});

describe('onboarding downgrade on revoke', () => {
  it.each([
    ['HOST', () => hostRevoke],
    ['VENUE_OWNER', () => venueRevoke],
    ['ECOMM_MANAGER', () => brandRevoke],
    ['CLUB_ADMIN', () => clubRevoke],
  ])('removing %s downgrades its onboarding entity', async (role, spy) => {
    const { id } = await makeUser(['USER', role]);
    const res = await userService.removeRole(id, role.toLowerCase());
    expect(spy()).toHaveBeenCalledWith(id);
    expect(res?.roles).toEqual(['USER']);
  });

  it('removing a non-onboarding role touches no onboarding entity', async () => {
    const { id } = await makeUser(['USER', 'FINANCE_USER']);
    await userService.removeRole(id, 'FINANCE_USER');
    for (const spy of [hostRevoke, venueRevoke, brandRevoke, clubRevoke]) expect(spy).not.toHaveBeenCalled();
  });

  it('logs a failed downgrade and keeps going with the next role', async () => {
    const { id } = await makeUser(['USER', 'HOST', 'VENUE_OWNER']);
    hostRevoke.mockRejectedValueOnce(new Error('host svc down'));
    await userService.assignRoles(id, ['USER']);
    expect(venueRevoke).toHaveBeenCalledWith(id);
    expect(logError).toHaveBeenCalledWith(
      'user.replaceUserRoles',
      'syncRevokedOnboarding',
      expect.objectContaining({ role: 'HOST', userId: id }),
    );
  });
});

describe('admin access', () => {
  it('grantAdmin adds SUPER_ADMIN, keeps the other roles and mails the welcome', async () => {
    const { id, email } = await makeUser(['USER']);
    const res = await userService.grantAdmin(id);
    expect(res?.roles).toEqual(expect.arrayContaining(['USER', 'SUPER_ADMIN']));
    expect(adminGrantedMail).toHaveBeenCalledWith({ to: email, name: 'Dev' });
    expect(adminRevokedMail).not.toHaveBeenCalled();
  });

  it('grantAdmin is idempotent: an existing admin is not rewritten or re-mailed', async () => {
    const { id } = await makeUser(['USER', 'SUPER_ADMIN']);
    const res = await userService.grantAdmin(id);
    expect(res?.roles).toEqual(expect.arrayContaining(['SUPER_ADMIN']));
    expect(adminGrantedMail).not.toHaveBeenCalled();
    expect(UserModel.db.startSession).not.toHaveBeenCalled();
  });

  it('revokeAdmin removes SUPER_ADMIN and mails the revocation', async () => {
    const { id, email } = await makeUser(['USER', 'SUPER_ADMIN']);
    const res = await userService.revokeAdmin(id);
    expect(res?.roles).toEqual(['USER']);
    expect(adminRevokedMail).toHaveBeenCalledWith({ to: email, name: 'Dev' });
  });

  it('revokeAdmin on a non-admin writes nothing and mails nothing', async () => {
    const { id } = await makeUser(['USER']);
    await userService.revokeAdmin(id);
    expect(adminRevokedMail).not.toHaveBeenCalled();
    expect(UserModel.db.startSession).not.toHaveBeenCalled();
  });

  it('revokeAdmin refuses the configured root admin, case-insensitively', async () => {
    const previous = process.env.DEFAULT_SUPER_ADMIN_EMAIL;
    process.env.DEFAULT_SUPER_ADMIN_EMAIL = 'Root@Example.com';
    try {
      const doc = await UserModel.create({
        profile: { first_name: 'Root' },
        auth: { email: 'root@example.com' },
        metadata: { status: 'ACTIVE', role_keys: ['SUPER_ADMIN'] },
      });
      const err = await userService.revokeAdmin(String(doc._id)).catch((e) => e);
      expect(err.message).toBe('The root super admin cannot be revoked');
      expect(err.extensions.code).toBe('FORBIDDEN');
      expect((await UserModel.findById(doc._id).lean<any>()).metadata.role_keys).toEqual(['SUPER_ADMIN']);
    } finally {
      if (previous === undefined) delete process.env.DEFAULT_SUPER_ADMIN_EMAIL;
      else process.env.DEFAULT_SUPER_ADMIN_EMAIL = previous;
    }
  });

  it('the Roles dialog door (assignRoles) sends the same admin mail', async () => {
    const { id } = await makeUser(['USER']);
    await userService.assignRoles(id, ['USER', 'SUPER_ADMIN']);
    expect(adminGrantedMail).toHaveBeenCalledTimes(1);
  });

  it('logs a failed admin mail without undoing the grant', async () => {
    const { id } = await makeUser(['USER']);
    adminGrantedMail.mockRejectedValueOnce(new Error('smtp down'));
    await userService.grantAdmin(id);
    expect((await UserModel.findById(id).lean<any>()).metadata.role_keys).toContain('SUPER_ADMIN');
    expect(logError).toHaveBeenCalledWith(
      'user.roles',
      'notifyAdminAccessChange',
      expect.objectContaining({ msg: 'admin access email failed', userId: id }),
    );
  });
});

describe('unknown user and the privileged gate', () => {
  it.each(['assignRoles', 'addRole', 'removeRole', 'grantAdmin', 'revokeAdmin'] as const)(
    '%s refuses an unknown user with NOT_FOUND',
    async (method) => {
      const missing = new Types.ObjectId().toString();
      const call = (userService as any)[method](missing, method === 'assignRoles' ? ['USER'] : 'USER');
      await expect(call).rejects.toMatchObject({ message: 'User not found', extensions: { code: 'NOT_FOUND' } });
      expect(await UserRoleModel.countDocuments({ user_id: missing })).toBe(0);
    },
  );

  it('isPrivileged is true only when a privileged role is present', () => {
    expect(userService.isPrivileged(['USER', 'FINANCE_MANAGER'])).toBe(true);
    expect(userService.isPrivileged(['USER', 'HOST'])).toBe(false);
    expect(userService.isPrivileged([])).toBe(false);
  });
});
