import { E2E_TRAFFIC_HEADER, isE2eTraffic, trafficKeyForRun } from '../../e2eRun.traffic';
import { isE2eGoogleCredential, mintE2eGoogleCredential, verifyE2eGoogleCredential } from '../../e2eRun.google';
import { grantRunAccountRoles } from '../../e2eRun.staff';
import { startE2eRunScheduler } from '../../e2eRun.scheduler';
import { e2eRunService } from '../../e2eRun.service';
import { e2eOverrides } from '../../e2eRun.mute';
import { runAccountMatcher, identityStamp } from '../../e2eRun.identity';
import { UserModel } from '@modules/access/user/user.model';
import { userService } from '@modules/access/user/user.service';
import { startClusterJob } from '@utils/clusterJob';

jest.mock('../../e2eRun.mute', () => ({ e2eOverrides: jest.fn() }));
jest.mock('../../e2eRun.service', () => ({ e2eRunService: { runIfDue: jest.fn() } }));
jest.mock('@modules/access/user/user.model', () => ({ UserModel: { findOne: jest.fn() } }));
jest.mock('@modules/access/user/user.service', () => ({ userService: { addRole: jest.fn() } }));
jest.mock('@utils/clusterJob', () => ({ startClusterJob: jest.fn() }));
jest.mock('@observability/log', () => ({ logs: { server: { info: jest.fn(), warn: jest.fn() } } }));

const matcher = runAccountMatcher({ email_prefix: 'qa+', email_domain: 'duncit.com', password: '', identity_phone: '919876543210' });
const on = () => (e2eOverrides as jest.Mock).mockResolvedValue({ muted: false, otpBypass: true, account: matcher });
const off = () => (e2eOverrides as jest.Mock).mockResolvedValue({ muted: false, otpBypass: false, account: matcher });
const STAMP = identityStamp(new Date());
const EMAIL = `qa+${STAMP}@duncit.com`;

describe('traffic key', () => {
  it('is handed out only for a real stamp, only on an e2e target', async () => {
    on();
    const key = await trafficKeyForRun(STAMP);
    expect(key.startsWith(`${STAMP}.`)).toBe(true);
    await expect(trafficKeyForRun('nope')).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(trafficKeyForRun(undefined as never)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    off();
    await expect(trafficKeyForRun(STAMP)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });

  const req = (value: unknown) => ({ headers: { [E2E_TRAFFIC_HEADER]: value } }) as never;

  it('recognises traffic that carries a valid, fresh key while the target switch is on', async () => {
    on();
    const key = await trafficKeyForRun(STAMP);
    await expect(isE2eTraffic(req(key))).resolves.toBe(true);
    await expect(isE2eTraffic(req([key, 'x']))).resolves.toBe(true);
  });

  it('refuses a missing, malformed, forged, stale or future key', async () => {
    on();
    const key = await trafficKeyForRun(STAMP);
    const [stamp, mac] = key.split('.');
    await expect(isE2eTraffic(req(undefined))).resolves.toBe(false);
    await expect(isE2eTraffic(req(''))).resolves.toBe(false);
    await expect(isE2eTraffic(req('nodot'))).resolves.toBe(false);
    await expect(isE2eTraffic(req(`${stamp}.`))).resolves.toBe(false);
    await expect(isE2eTraffic(req(`${stamp}.deadbeef`))).resolves.toBe(false);
    await expect(isE2eTraffic(req(`abc.${mac}`))).resolves.toBe(false);
    const old = identityStamp(new Date(Date.now() - 7 * 3_600_000));
    const oldKey = await trafficKeyForRun(old);
    await expect(isE2eTraffic(req(oldKey))).resolves.toBe(false);
    const future = identityStamp(new Date(Date.now() + 7 * 3_600_000));
    await expect(isE2eTraffic(req(await trafficKeyForRun(future)))).resolves.toBe(false);
  });

  it('honours a good key only while the switch that declares an e2e target is on', async () => {
    on();
    const key = await trafficKeyForRun(STAMP);
    off();
    await expect(isE2eTraffic(req(key))).resolves.toBe(false);
  });
});

describe('Google stand-in credential', () => {
  it('recognises its own prefix only', () => {
    expect(isE2eGoogleCredential('e2e-google.a.b')).toBe(true);
    expect(isE2eGoogleCredential('eyJhbGciOi...')).toBe(false);
  });

  it('is minted for a run account on an e2e target and accepted as Google’s answer for it', async () => {
    on();
    const credential = await mintE2eGoogleCredential({ email: ` ${EMAIL.toUpperCase()} `, given_name: ' Riya ', family_name: ' Rao ' });
    expect(isE2eGoogleCredential(credential)).toBe(true);
    await expect(verifyE2eGoogleCredential(credential, 'client-1')).resolves.toEqual({
      email: EMAIL.toLowerCase(), email_verified: true, given_name: 'Riya', family_name: 'Rao', name: 'Riya Rao', sub: `e2e:${EMAIL.toLowerCase()}`, aud: 'client-1',
    });
  });

  it('is never minted for a real address or on a server that is not an e2e target', async () => {
    on();
    await expect(mintE2eGoogleCredential({ email: 'real@duncit.com', given_name: 'a', family_name: 'b' })).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(mintE2eGoogleCredential({ email: undefined as never, given_name: 'a', family_name: 'b' })).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    off();
    await expect(mintE2eGoogleCredential({ email: EMAIL, given_name: 'a', family_name: 'b' })).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
  });

  it('defaults a missing name to empty', async () => {
    on();
    const credential = await mintE2eGoogleCredential({ email: EMAIL, given_name: undefined as never, family_name: undefined as never });
    await expect(verifyE2eGoogleCredential(credential, 'c')).resolves.toMatchObject({ given_name: '', family_name: '', name: '' });
  });

  it('refuses a forged, tampered, malformed, expired or off-target credential with one answer', async () => {
    on();
    const credential = await mintE2eGoogleCredential({ email: EMAIL, given_name: 'a', family_name: 'b' });
    const [prefix, encoded, mac] = credential.split('.');
    const refusal = { message: 'Invalid Google credential', extensions: { code: 'UNAUTHENTICATED' } };
    await expect(verifyE2eGoogleCredential(`${prefix}.${encoded}.bad`, 'c')).rejects.toMatchObject(refusal);
    await expect(verifyE2eGoogleCredential(`${prefix}.${Buffer.from('{"email":"x@duncit.com"}').toString('base64url')}.${mac}`, 'c')).rejects.toMatchObject(refusal);
    await expect(verifyE2eGoogleCredential('e2e-google', 'c')).rejects.toMatchObject(refusal);
    await expect(verifyE2eGoogleCredential('', 'c')).rejects.toMatchObject(refusal);

    const { e2eSignature } = await import('../../e2eRun.signature');
    const sign = (body: string) => `${prefix}.${body}.${e2eSignature(prefix, body)}`;
    const notJson = Buffer.from('not json').toString('base64url');
    await expect(verifyE2eGoogleCredential(sign(notJson), 'c')).rejects.toMatchObject(refusal);
    const stale = Buffer.from(JSON.stringify({ email: EMAIL, given_name: 'a', family_name: 'b', iat: Date.now() - 7 * 3_600_000 })).toString('base64url');
    await expect(verifyE2eGoogleCredential(sign(stale), 'c')).rejects.toMatchObject(refusal);
    off();
    await expect(verifyE2eGoogleCredential(credential, 'c')).rejects.toMatchObject(refusal);
  });
});

describe('grantRunAccountRoles', () => {
  const input = (over: Record<string, unknown> = {}) => ({ stamp: STAMP, email: EMAIL, roles: ['support_manager'], ...over }) as never;
  const lean = (value: unknown) => ({ lean: () => Promise.resolve(value) });

  it('grants the portal roles to the run account and answers with its roles', async () => {
    on();
    (UserModel.findOne as jest.Mock).mockReturnValue(lean({ _id: 'u1' }));
    (userService.addRole as jest.Mock).mockResolvedValueOnce({ roles: ['SUPPORT_MANAGER'] }).mockResolvedValueOnce({ roles: ['SUPPORT_MANAGER', 'LEGAL_MANAGER'] });
    await expect(grantRunAccountRoles(input({ roles: [' support_manager ', 'LEGAL_MANAGER'] }))).resolves.toEqual(['SUPPORT_MANAGER', 'LEGAL_MANAGER']);
    expect(UserModel.findOne).toHaveBeenCalledWith({ 'auth.email': EMAIL }, { _id: 1 });
    expect(userService.addRole).toHaveBeenNthCalledWith(1, 'u1', 'SUPPORT_MANAGER');
  });

  it('answers an empty list when the account comes back with no roles', async () => {
    on();
    (UserModel.findOne as jest.Mock).mockReturnValue(lean({ _id: 'u1' }));
    (userService.addRole as jest.Mock).mockResolvedValue({ roles: null });
    await expect(grantRunAccountRoles(input())).resolves.toEqual([]);
  });

  it.each([
    ['a stamp that is not one', { stamp: 'x' }],
    ['no stamp', { stamp: undefined }],
    ['no roles', { roles: [] }],
    ['no roles key at all', { roles: undefined }],
    ['a role that is not a portal role', { roles: ['SUPER_ADMIN'] }],
    ['one bad role among good ones', { roles: ['SUPPORT_MANAGER', 'SUPER_ADMIN'] }],
  ])('refuses %s', async (_label, over) => {
    on();
    await expect(grantRunAccountRoles(input(over))).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    expect(userService.addRole).not.toHaveBeenCalled();
  });

  it('refuses on a server that is not an e2e target, for an address without the stamp, and for a real account', async () => {
    off();
    await expect(grantRunAccountRoles(input())).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    on();
    await expect(grantRunAccountRoles(input({ email: 'qa+000000000000@duncit.com' }))).rejects.toMatchObject({ message: 'That address is not this run’s account.' });
    await expect(grantRunAccountRoles(input({ email: undefined }))).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    (e2eOverrides as jest.Mock).mockResolvedValue({ muted: false, otpBypass: true, account: null });
    await expect(grantRunAccountRoles(input())).rejects.toMatchObject({ message: 'That address is not this run’s account.' });
    expect(userService.addRole).not.toHaveBeenCalled();
  });

  it('refuses when the run account does not exist', async () => {
    on();
    (UserModel.findOne as jest.Mock).mockReturnValue(lean(null));
    await expect(grantRunAccountRoles(input())).rejects.toMatchObject({ message: 'The run account does not exist.', extensions: { code: 'NOT_FOUND' } });
  });
});

describe('startE2eRunScheduler', () => {
  it('asks the service every minute whether a run is owed, first after two minutes', async () => {
    const stop = jest.fn();
    (startClusterJob as jest.Mock).mockReturnValue(stop);
    expect(startE2eRunScheduler()).toBe(stop);
    const options = (startClusterJob as jest.Mock).mock.calls[0][0];
    expect(options).toMatchObject({ component: 'e2e-scheduler', operation: 'tick', firstDelayMs: 120_000, intervalMs: 60_000 });
    (e2eRunService.runIfDue as jest.Mock).mockResolvedValue(null);
    await options.run();
    expect(e2eRunService.runIfDue).toHaveBeenCalledWith();
  });
});
