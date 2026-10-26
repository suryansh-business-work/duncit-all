/**
 * The e2e overrides, the one-time codes held for the run account, and the purge
 * that removes the run account afterwards — against a real database. Only
 * ImageKit (another system) is stubbed.
 */
jest.mock('@modules/platform/upload/mediaLibrary.service', () => ({
  mediaLibraryService: { list: jest.fn(), remove: jest.fn() },
}));

import { logs } from '@observability/log';
import { E2E_SETTINGS_KEY, E2eRunSettingsModel } from '../../e2eRun.model';
import { MUTED_REASON, communicationsMuted, e2eOverrides, forgetMuteCache } from '../../e2eRun.mute';
import {
  E2E_HELD_REASON,
  E2eOneTimeCodeModel,
  forgetRunAccountCodes,
  holdRunAccountCode,
  latestRunAccountCode,
} from '../../e2eRun.codes';
import { purgeE2eRunData } from '../../e2eRun.purge';
import { UserModel } from '@modules/access/user/user.model';
import { UserAddressModel } from '@modules/access/addressBook/addressBook.model';
import { OtpChallengeModel } from '@modules/platform/otp/otp.model';
import { mediaLibraryService } from '@modules/platform/upload/mediaLibrary.service';

const STAMP = '070920260300';
const EMAIL = `qa+${STAMP}@duncit.com`;
const PHONE = '919876543210';

const settings = (set: Record<string, unknown>) =>
  E2eRunSettingsModel.updateOne({ key: E2E_SETTINGS_KEY }, { $set: set }, { upsert: true }).then(() => forgetMuteCache());
const seedRunAccount = (over: Record<string, unknown> = {}) =>
  settings({ otp_bypass: true, email_prefix: 'qa+', email_domain: 'duncit.com', identity_phone: PHONE, ...over });

beforeEach(() => {
  forgetMuteCache();
  jest.spyOn(logs.server, 'info').mockImplementation(() => undefined);
  jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

describe('e2eOverrides', () => {
  it('reads everything off when no settings exist', async () => {
    await expect(e2eOverrides()).resolves.toEqual({ muted: false, otpBypass: false, account: null });
    await expect(communicationsMuted()).resolves.toBe(false);
    expect(MUTED_REASON).toContain('E2E');
  });

  it('reads the two switches and the run-account matcher from the settings', async () => {
    await seedRunAccount({ mute_communications: true });
    const out = await e2eOverrides();
    expect(out).toMatchObject({ muted: true, otpBypass: true });
    expect(out.account?.email.test(EMAIL)).toBe(true);
    expect(out.account?.phone).toBe(PHONE);
    await expect(communicationsMuted()).resolves.toBe(true);
  });

  it('has no run-account matcher when the identity is only half filled', async () => {
    await settings({ otp_bypass: true, email_prefix: '', email_domain: 'duncit.com', mute_communications: false });
    expect((await e2eOverrides()).account).toBeNull();
  });

  it('treats an identity that was never filled in as unset, even when the switch is on', async () => {
    await E2eRunSettingsModel.collection.insertOne({ key: E2E_SETTINGS_KEY, otp_bypass: true });
    forgetMuteCache();
    await expect(e2eOverrides()).resolves.toMatchObject({ muted: false, otpBypass: true, account: null });
  });

  it('trusts an answer for ten seconds and re-reads once told a switch changed', async () => {
    await settings({ mute_communications: false });
    expect((await e2eOverrides()).muted).toBe(false);
    await E2eRunSettingsModel.updateOne({ key: E2E_SETTINGS_KEY }, { $set: { mute_communications: true } });
    expect((await e2eOverrides()).muted).toBe(false);
    forgetMuteCache();
    expect((await e2eOverrides()).muted).toBe(true);
  });

  it('fails open when the database cannot be read, and does not trust that answer afterwards', async () => {
    await settings({ mute_communications: true, otp_bypass: true });
    jest.spyOn(E2eRunSettingsModel, 'findOne').mockImplementationOnce(() => {
      throw new Error('mongo down');
    });
    await expect(e2eOverrides()).resolves.toEqual({ muted: false, otpBypass: false, account: null });
    expect(logs.server.warn).toHaveBeenCalledWith('e2e.overrides', 'e2eOverrides', { error: expect.any(Error) });
    expect((await e2eOverrides()).muted).toBe(true);
  });
});

describe('holdRunAccountCode', () => {
  it('holds and records a code addressed to the run account instead of letting it be sent', async () => {
    await seedRunAccount();
    await expect(holdRunAccountCode({ purpose: 'LOGIN', email: ` ${EMAIL.toUpperCase()} `, code: '123456' })).resolves.toBe(true);
    const doc = await E2eOneTimeCodeModel.findOne().lean();
    expect(doc).toMatchObject({ purpose: 'LOGIN', email: EMAIL, phone_number: '', code: '123456' });
    expect(doc?.expires_at.getTime()).toBeGreaterThan(Date.now() + 14 * 60_000);
    expect(E2E_HELD_REASON).toContain('E2E run account');
  });

  it('holds a code for the run phone, whatever punctuation it arrives with', async () => {
    await seedRunAccount();
    await expect(holdRunAccountCode({ purpose: 'SIGNUP', phone_number: '+91 98765-43210', code: '654321' })).resolves.toBe(true);
    expect(await E2eOneTimeCodeModel.findOne().lean()).toMatchObject({ phone_number: PHONE, email: '' });
  });

  it('names the purpose from an email template when none is given', async () => {
    await seedRunAccount();
    await expect(holdRunAccountCode({ template: 'portal-login-otp', email: EMAIL, code: '1' })).resolves.toBe(true);
    expect((await E2eOneTimeCodeModel.findOne().lean())?.purpose).toBe('PORTAL_LOGIN');
  });

  it.each([
    ['an unknown template', { template: 'welcome', email: EMAIL, code: '1' }],
    ['no purpose or template', { email: EMAIL, code: '1' }],
    ['an empty code', { purpose: 'LOGIN', email: EMAIL, code: '' }],
    ['a missing code', { purpose: 'LOGIN', email: EMAIL, code: null }],
    ['a real member’s address', { purpose: 'LOGIN', email: 'real@duncit.com', code: '1' }],
    ['someone else’s phone', { purpose: 'LOGIN', phone_number: '911111111111', code: '1' }],
    ['no address or phone at all', { purpose: 'LOGIN', code: '1' }],
  ])('does not hold a code for %s', async (_label, input) => {
    await seedRunAccount();
    await expect(holdRunAccountCode(input as never)).resolves.toBe(false);
    expect(await E2eOneTimeCodeModel.countDocuments()).toBe(0);
  });

  it('holds nothing while the switch that declares an e2e target is off, or the identity is not set', async () => {
    await seedRunAccount({ otp_bypass: false });
    await expect(holdRunAccountCode({ purpose: 'LOGIN', email: EMAIL, code: '1' })).resolves.toBe(false);
    await seedRunAccount({ email_prefix: '' });
    await expect(holdRunAccountCode({ purpose: 'LOGIN', email: EMAIL, code: '1' })).resolves.toBe(false);
  });

  it('prefers the address over the phone when both are given', async () => {
    await seedRunAccount();
    await expect(holdRunAccountCode({ purpose: 'LOGIN', email: 'real@duncit.com', phone_number: PHONE, code: '1' })).resolves.toBe(false);
  });
});

describe('latestRunAccountCode', () => {
  it('is refused on a server that is not an e2e target', async () => {
    await seedRunAccount({ otp_bypass: false });
    await expect(latestRunAccountCode({ purpose: 'LOGIN', email: EMAIL })).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });

  it('is refused for anything that is not a run account', async () => {
    await seedRunAccount();
    await expect(latestRunAccountCode({ purpose: 'LOGIN', email: 'real@duncit.com' })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('hands back the newest live code for a purpose and account, null when none was issued', async () => {
    await seedRunAccount();
    await expect(latestRunAccountCode({ purpose: 'LOGIN', email: EMAIL })).resolves.toBeNull();
    await holdRunAccountCode({ purpose: 'LOGIN', email: EMAIL, code: 'old' });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await holdRunAccountCode({ purpose: 'LOGIN', email: EMAIL, code: 'new' });
    await holdRunAccountCode({ purpose: 'PASSWORD_RESET', email: EMAIL, code: 'other' });
    const out = await latestRunAccountCode({ purpose: 'LOGIN', email: EMAIL });
    expect(out).toMatchObject({ code: 'new', purpose: 'LOGIN' });
    expect(out?.issued_at).toEqual(expect.any(String));
    expect(out?.expires_at).toEqual(expect.any(String));
  });

  it('finds a phone code by number, and ignores an expired one', async () => {
    await seedRunAccount();
    await holdRunAccountCode({ purpose: 'SIGNUP', phone_number: PHONE, code: '777' });
    await expect(latestRunAccountCode({ purpose: 'SIGNUP', phone: PHONE })).resolves.toMatchObject({ code: '777' });
    await E2eOneTimeCodeModel.collection.updateMany({}, { $set: { expires_at: new Date(Date.now() - 1000) } });
    await expect(latestRunAccountCode({ purpose: 'SIGNUP', phone: PHONE })).resolves.toBeNull();
  });

  it('treats a missing purpose as one that matches nothing', async () => {
    await seedRunAccount();
    await expect(latestRunAccountCode({ purpose: undefined as never, email: EMAIL })).resolves.toBeNull();
  });
});

describe('forgetRunAccountCodes', () => {
  it('forgets the codes for an address and a number, and only those', async () => {
    await seedRunAccount();
    await holdRunAccountCode({ purpose: 'LOGIN', email: EMAIL, code: '1' });
    await holdRunAccountCode({ purpose: 'SIGNUP', phone_number: PHONE, code: '2' });
    await E2eOneTimeCodeModel.create({ purpose: 'LOGIN', email: 'qa+000000000000@duncit.com', code: '3', expires_at: new Date(Date.now() + 60_000) });
    await expect(forgetRunAccountCodes(EMAIL, PHONE)).resolves.toBe(2);
    expect(await E2eOneTimeCodeModel.countDocuments()).toBe(1);
  });

  it('does not match on the phone when there is none', async () => {
    await E2eOneTimeCodeModel.create({ purpose: 'LOGIN', email: '', phone_number: '', code: '3', expires_at: new Date(Date.now() + 60_000) });
    await expect(forgetRunAccountCodes(EMAIL, '')).resolves.toBe(0);
    await expect(forgetRunAccountCodes(EMAIL, 'no digits')).resolves.toBe(0);
  });
});

describe('purgeE2eRunData', () => {
  const list = mediaLibraryService.list as jest.Mock;
  const remove = mediaLibraryService.remove as jest.Mock;
  beforeEach(() => {
    list.mockResolvedValue([]);
    remove.mockResolvedValue(0);
  });

  const account = (email: string) => UserModel.create({ auth: { email }, profile: { first_name: 'Run' } });

  it.each([
    ['a stamp that is not twelve digits', { stamp: '123', signup_email: EMAIL }],
    ['no stamp', { stamp: undefined, signup_email: EMAIL }],
    ['no address', { stamp: STAMP, signup_email: '  ' }],
    ['a missing address', { stamp: STAMP }],
  ])('refuses %s', async (_label, input) => {
    await seedRunAccount();
    await expect(purgeE2eRunData(input as never)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('refuses on a server that is not an e2e target, so it can never delete by email in production', async () => {
    await seedRunAccount({ otp_bypass: false });
    await account(EMAIL);
    await expect(purgeE2eRunData({ stamp: STAMP, signup_email: EMAIL })).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(await UserModel.countDocuments()).toBe(1);
  });

  it('refuses an address that is not an email, or does not carry the run stamp', async () => {
    await seedRunAccount();
    await expect(purgeE2eRunData({ stamp: STAMP, signup_email: 'nope' })).rejects.toMatchObject({ message: 'signup_email must be an email address.' });
    await expect(purgeE2eRunData({ stamp: STAMP, signup_email: '@duncit.com' })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(purgeE2eRunData({ stamp: STAMP, signup_email: 'real@duncit.com' })).rejects.toMatchObject({
      message: expect.stringContaining('does not carry the run stamp'),
    });
  });

  it('removes the run account, one a scenario derived from it, its challenges and codes and its uploads, but never a real member', async () => {
    await seedRunAccount();
    await account(EMAIL);
    await account(`qa+${STAMP}-new@duncit.com`);
    await account('qa@duncit.com');
    await account(`qa+${STAMP.replace('0', '1')}@duncit.com`);
    await OtpChallengeModel.collection.insertMany([
      { email: EMAIL, purpose: 'LOGIN', created_at: new Date() },
      { phone_number: PHONE, purpose: 'SIGNUP', created_at: new Date() },
      { email: 'real@duncit.com', purpose: 'LOGIN', created_at: new Date() },
    ]);
    await holdRunAccountCode({ purpose: 'LOGIN', email: EMAIL, code: '1' });
    list.mockResolvedValue([{ fileId: 'f1' }, { fileId: 'f2' }]);
    remove.mockResolvedValue(2);

    const out = await purgeE2eRunData({ stamp: ` ${STAMP} `, signup_email: ` ${EMAIL.toUpperCase()} ` });

    expect(out.accounts_deleted).toBe(2);
    expect(out.records.map((r) => [r.collection, r.deleted])).toEqual([
      ['podmembers', 0],
      ['podauditlogs', 0],
      ['pods', 0],
      ['shortlinks', 0],
      ['clubs', 0],
      [OtpChallengeModel.collection.name, 2],
      ['e2e one-time codes', 1],
      ['imagekit:/pods', 2],
    ]);
    const left = (await UserModel.find().lean()).map((u) => u.auth?.email);
    expect(left.sort()).toEqual(['qa+170920260300@duncit.com', 'qa@duncit.com']);
    expect(await OtpChallengeModel.countDocuments()).toBe(1);
    expect(list).toHaveBeenCalledWith({ search: `e2e-${STAMP}`, path: '/pods', limit: 100 });
    expect(remove).toHaveBeenCalledWith(['f1', 'f2'], { id: 'e2e-purge' });
  });

  it('removes what points at the run account along with it', async () => {
    await seedRunAccount();
    const run = await account(EMAIL);
    const other = await account('qa@duncit.com');
    await UserAddressModel.collection.insertMany([{ user_id: run._id }, { user_id: run._id }, { user_id: other._id }]);
    await purgeE2eRunData({ stamp: STAMP, signup_email: EMAIL });
    expect(await UserAddressModel.collection.countDocuments({ user_id: run._id })).toBe(0);
    expect(await UserAddressModel.collection.countDocuments({ user_id: other._id })).toBe(1);
  });

  it('purges when the run identity is not configured, matching no phone', async () => {
    await settings({ otp_bypass: true, email_prefix: '', email_domain: '', identity_phone: '' });
    await expect(purgeE2eRunData({ stamp: STAMP, signup_email: EMAIL })).resolves.toMatchObject({ accounts_deleted: 0 });
  });

  it('purges with no accounts to remove, and with no phone configured', async () => {
    await seedRunAccount({ identity_phone: '' });
    const out = await purgeE2eRunData({ stamp: STAMP, signup_email: EMAIL });
    expect(out.accounts_deleted).toBe(0);
    expect(out.records).toHaveLength(8);
  });

  it('reports zero uploads removed, and says why in the log, when ImageKit cannot be reached', async () => {
    await seedRunAccount();
    list.mockRejectedValue(new Error('ImageKit is not configured'));
    const out = await purgeE2eRunData({ stamp: STAMP, signup_email: EMAIL });
    expect(out.records.at(-1)).toEqual({ collection: 'imagekit:/pods', deleted: 0 });
    expect(logs.server.warn).toHaveBeenCalledWith('e2eRun', 'purgeStampedUploads', { error: expect.any(Error), stamp: STAMP });
  });
});
