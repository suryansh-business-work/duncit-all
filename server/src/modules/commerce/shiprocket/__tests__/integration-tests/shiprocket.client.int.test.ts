import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { getShiprocketAccount } from '../../shiprocket.account';
import { shiprocketLoginState } from '../../shiprocket.client';
import { ShiprocketSessionModel } from '../../shiprocketSession.model';
import { createOrderAdhoc, walletBalance } from '../../shiprocket.gateway';
import { installFakeShiprocket, runtimeSecret, seedShiprocketAccount, type FakeShiprocket } from './fake-shiprocket';

/**
 * The one door every ShipRocket call goes through. What matters here is what
 * survives a deploy: the token is kept in the database (logging in on every
 * boot is a login ShipRocket counts), and a refused login stays refused until
 * the credentials change — retrying a wrong password is what locks the
 * account.
 */
const LOGIN = '/auth/login';
const WALLET = '/account/details/wallet-balance';
const HOUR = 3_600_000;

let sr: FakeShiprocket;

beforeEach(() => {
  sr = installFakeShiprocket();
});

afterEach(() => {
  sr.restore();
});

const session = () => ShiprocketSessionModel.findOne({ key: 'default' }).select('+token').lean();

/** A token already held for the current credentials (distinct from any login's), expiring `hoursLeft` from now. */
async function holdToken(hoursLeft: number) {
  const account = await getShiprocketAccount();
  const token = ['e30', Buffer.from(JSON.stringify({ held: true })).toString('base64url'), 'c2ln'].join('.');
  await ShiprocketSessionModel.create({
    key: 'default',
    cred_hash: account?.hash,
    token,
    expires_at: new Date(Date.now() + hoursLeft * HOUR),
  });
  return token;
}

describe('the token', () => {
  it('logs in once and keeps the token in the database for every later call', async () => {
    await seedShiprocketAccount();
    await walletBalance();
    await walletBalance();

    expect(sr.count('POST', LOGIN)).toBe(1);
    const held = await session();
    const account = await getShiprocketAccount();
    expect(held?.cred_hash).toBe(account?.hash);
    expect(held?.token.split('.')).toHaveLength(3);
    // Expiry is read from the JWT's own `exp` (ten days here).
    expect(held?.expires_at?.getTime()).toBeGreaterThan(Date.now() + 9 * 24 * HOUR);
    expect(sr.calls.filter((c) => c.path === WALLET).map((c) => c.auth)).toEqual([
      `Bearer ${held?.token}`,
      `Bearer ${held?.token}`,
    ]);
  });

  // A redeploy does not log in again: the stored token is still good.
  it('uses a stored token without logging in', async () => {
    await seedShiprocketAccount();
    const token = await holdToken(72);
    await walletBalance();
    expect(sr.count('POST', LOGIN)).toBe(0);
    expect(sr.last('GET', WALLET)?.auth).toBe(`Bearer ${token}`);
  });

  it('renews a token a day before it runs out', async () => {
    await seedShiprocketAccount();
    const old = await holdToken(2);
    await walletBalance();
    expect(sr.count('POST', LOGIN)).toBe(1);
    expect(sr.last('GET', WALLET)?.auth).not.toBe(`Bearer ${old}`);
  });

  it('logs in again once, and replays the call, when ShipRocket answers 401', async () => {
    await seedShiprocketAccount();
    sr.failNext('GET', WALLET, 401);
    await expect(walletBalance()).resolves.toBe(1500);
    expect(sr.count('POST', LOGIN)).toBe(2);
    expect(sr.count('GET', WALLET)).toBe(2);
  });

  it('gives up on a second 401 rather than looping', async () => {
    await seedShiprocketAccount();
    sr.failNext('GET', WALLET, 401, 2);
    await expect(walletBalance()).rejects.toThrow('ShipRocket: ShipRocket answered 401');
    expect(sr.count('GET', WALLET)).toBe(2);
  });
});

describe('a refused login', () => {
  it('is latched: no further login is attempted until the password changes in the Tech portal', async () => {
    const { entry } = await seedShiprocketAccount();
    sr.state.loginStatus = 403;

    await expect(walletBalance()).rejects.toThrow(
      'ShipRocket login failed: Invalid email and password combination. Fix the API user in the Tech portal or in ShipRocket, then press Retry login on E-commerce → Shipping → ShipRocket.'
    );
    await expect(walletBalance()).rejects.toThrow('not retried until they change');
    await expect(createOrderAdhoc({})).rejects.toThrow('Invalid email and password combination');
    expect(sr.count('POST', LOGIN)).toBe(1);
    expect(sr.calls).toHaveLength(1);
    await expect(shiprocketLoginState()).resolves.toEqual({
      configured: true,
      refused: true,
      message: 'Invalid email and password combination',
    });

    // The owner fixes the password: the new credentials are tried at once.
    await EnvEntryModel.updateOne({ _id: entry._id }, { $set: { 'config.password': runtimeSecret('sr') } });
    sr.state.loginStatus = 200;

    await expect(walletBalance()).resolves.toBe(1500);
    expect(sr.count('POST', LOGIN)).toBe(2);
    await expect(shiprocketLoginState()).resolves.toMatchObject({ refused: false, message: '' });
  });

  // A 5xx is ShipRocket having a bad minute, not a verdict on the password.
  it('is not latched when ShipRocket itself fails', async () => {
    await seedShiprocketAccount();
    sr.state.loginStatus = 502;
    await expect(walletBalance()).rejects.toThrow('ShipRocket login failed: Service Temporarily Unavailable');
    sr.state.loginStatus = 200;
    await expect(walletBalance()).resolves.toBe(1500);
    expect(sr.count('POST', LOGIN)).toBe(2);
  });
});

describe('retries', () => {
  it('retries a read after a 5xx', async () => {
    await seedShiprocketAccount();
    sr.failNext('GET', WALLET, 503);
    await expect(walletBalance()).resolves.toBe(1500);
    expect(sr.count('GET', WALLET)).toBe(2);
  });

  // Re-sending "create order" after a failure could book a second parcel.
  it('never retries a create', async () => {
    await seedShiprocketAccount();
    sr.failNext('POST', '/orders/create/adhoc', 503);
    await expect(createOrderAdhoc({ order_id: 'DUN-ORD-7F3K2' })).rejects.toThrow('ShipRocket: ShipRocket answered 503');
    expect(sr.count('POST', '/orders/create/adhoc')).toBe(1);
  });
});

describe('configuration', () => {
  it('names the Tech portal, and calls nothing, when no account is configured', async () => {
    await expect(walletBalance()).rejects.toThrow('ShipRocket is not configured. Add the credentials in the Tech portal.');
    expect(sr.calls).toHaveLength(0);
    await expect(shiprocketLoginState()).resolves.toEqual({ configured: false, refused: false, message: '' });
  });

  it('prefers the entry mapped to the E-commerce console over the default', async () => {
    await seedShiprocketAccount({ email: 'default@duncit.com' });
    await EnvEntryModel.create({
      name: 'ShipRocket — ecomm',
      category: 'SHIPROCKET',
      is_active: true,
      assigned_portals: ['ecomm-portal'],
      config: { email: 'store@duncit.com', password: runtimeSecret('sr'), pickup_location: 'DUN-WH-BLR' },
    });
    await walletBalance();
    expect(sr.last('POST', LOGIN)?.body.email).toBe('store@duncit.com');
    await expect(getShiprocketAccount()).resolves.toMatchObject({ pickupLocation: 'DUN-WH-BLR', webhookSecret: '' });
  });
});
