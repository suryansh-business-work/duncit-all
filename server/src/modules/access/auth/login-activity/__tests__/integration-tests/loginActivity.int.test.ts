import { Types } from 'mongoose';
import { logs } from '@observability/log';
import { noteSignIn } from '@modules/access/user/user.signin';
import { loginActivityService } from '../../loginActivity.service';
import { LOGIN_ACTIVITY_RETENTION_DAYS, LoginActivityModel } from '../../loginActivity.model';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

const newUserId = () => new Types.ObjectId().toString();
const rowsOf = (userId: string) => LoginActivityModel.find({ user_id: new Types.ObjectId(userId) }).lean();

describe('loginActivityService.record', () => {
  it('stores the method, the first forwarded address, the device and the origin host', async () => {
    const userId = newUserId();
    await loginActivityService.record(userId, 'EMAIL', {
      userAgent: CHROME_WINDOWS,
      forwardedFor: '10.1.2.3, 172.16.0.1',
      remoteAddress: '127.0.0.1',
      surface: '  PORTAL  ',
      origin: 'https://admin.duncit.com',
    });

    const [row] = await rowsOf(userId);
    expect(row).toMatchObject({
      provider: 'EMAIL',
      // The left-most hop is the client; the rest are proxies.
      ip: '10.1.2.3',
      browser: 'Chrome',
      os: 'Windows',
      device_type: 'DESKTOP',
      surface: 'PORTAL',
      origin_host: 'admin.duncit.com',
      // A private address has no geo-IP record, so the place stays unknown.
      city: null,
      region: null,
      country: null,
    });
  });

  it('falls back to the socket address and keeps unknowns as nulls', async () => {
    const userId = newUserId();
    await loginActivityService.record(userId, null, {
      remoteAddress: '::ffff:192.168.1.9',
      surface: '   ',
      origin: 'not a url',
    });

    const [row] = await rowsOf(userId);
    expect(row).toMatchObject({ provider: null, ip: '192.168.1.9', surface: null, origin_host: null });
  });

  it('caps a declared surface at 40 characters and ignores an empty origin', async () => {
    const userId = newUserId();
    await loginActivityService.record(userId, 'OTP', { surface: 'S'.repeat(60), origin: '' });

    const [row] = await rowsOf(userId);
    expect(row?.surface).toBe('S'.repeat(40));
    expect(row?.origin_host).toBeNull();
    expect(row?.ip).toBeNull();
  });
});

describe('loginActivityService.listMine', () => {
  const at = (minutesAgo: number) => new Date(Date.now() - minutesAgo * 60_000);

  it("returns only the member's own sign-ins, newest first, with the retention window", async () => {
    const userId = newUserId();
    await LoginActivityModel.insertMany([
      { user_id: new Types.ObjectId(userId), signed_in_at: at(30), provider: 'EMAIL' },
      { user_id: new Types.ObjectId(userId), signed_in_at: at(5), provider: 'GOOGLE', city: 'Pune' },
      { user_id: new Types.ObjectId(newUserId()), signed_in_at: at(1), provider: 'OTP' },
    ]);

    const history = await loginActivityService.listMine(userId);

    expect(history.retention_days).toBe(LOGIN_ACTIVITY_RETENTION_DAYS);
    expect(history.entries.map((entry) => entry.provider)).toEqual(['GOOGLE', 'EMAIL']);
    expect(history.entries[0]).toMatchObject({ city: 'Pune', ip: null, origin_host: null });
    expect(history.entries[0]?.id).toMatch(/^[0-9a-f]{24}$/);
    expect(new Date(history.entries[0]?.signed_in_at ?? '').toISOString()).toBe(history.entries[0]?.signed_in_at);
  });

  it('pages 50 by default and holds any asked-for limit between 1 and 100', async () => {
    const userId = newUserId();
    await LoginActivityModel.insertMany(
      Array.from({ length: 105 }, (_, i) => ({ user_id: new Types.ObjectId(userId), signed_in_at: at(i) })),
    );

    expect((await loginActivityService.listMine(userId)).entries).toHaveLength(50);
    expect((await loginActivityService.listMine(userId, 0)).entries).toHaveLength(1);
    expect((await loginActivityService.listMine(userId, 12.9)).entries).toHaveLength(12);
    expect((await loginActivityService.listMine(userId, 500)).entries).toHaveLength(100);
  });
});

describe('noteSignIn login activity', () => {
  afterEach(() => jest.restoreAllMocks());

  it('records a row for every sign-in, including an account with no email to notify', async () => {
    const userId = newUserId();
    await noteSignIn({ _id: userId, auth: { last_login_provider: 'APPLE' } }, { userAgent: CHROME_WINDOWS });

    const rows = await rowsOf(userId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ provider: 'APPLE', browser: 'Chrome' });
  });

  it('never fails the sign-in when the activity write does, and logs why', async () => {
    const failure = new Error('write refused');
    jest.spyOn(loginActivityService, 'record').mockRejectedValueOnce(failure);
    const warn = jest.spyOn(logs.server, 'warn').mockImplementation(() => undefined);

    await expect(noteSignIn({ _id: newUserId() }, {})).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('user.signin', 'recordLoginActivity', { error: failure });
  });
});
