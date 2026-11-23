import { Types } from 'mongoose';
import { PolicyModel } from '@modules/content/policy/policy.model';
import { logs } from '@observability/log';
import { isPortalSessionPending, setCurrentPolicyVersion, verifiedClaim } from '../../portalSecurity.claims';
import { PORTAL_SECURITY_NOTICE_VERSION } from '../../portalSecurity.constants';
import { hashIp, openCoordinates, sealField } from '../../portalSecurity.crypto';
import { NOT_AN_EMPLOYEE, employeeStanding } from '../../portalSecurity.employee';
import { refreshPolicyVersion, startPolicyVersionRefresh } from '../../portalSecurity.policy';
import { displayName, portalSecurityService, requestFacts } from '../../portalSecurity.service';

/**
 * The parts of Security Verification that read the request, the clock or the
 * server's secret rather than the database: what the server may take from a
 * request, what it does when there is no secret to key a hash with, and how the
 * consent version is kept current without anyone asking.
 */

// The sealing key and the address hash are derived from the server secret, and
// the unit project does not set one (the database projects do, in global-setup).
const originalSecret = process.env.JWT_SECRET;
beforeAll(() => {
  process.env.JWT_SECRET = originalSecret ?? 'unit-test-secret';
});
afterAll(() => {
  if (originalSecret === undefined) Reflect.deleteProperty(process.env, 'JWT_SECRET');
  else process.env.JWT_SECRET = originalSecret;
});

afterEach(() => {
  setCurrentPolicyVersion(null);
  jest.useRealTimers();
  jest.restoreAllMocks();
  process.env.NODE_ENV = 'test';
});

describe('a sealed value that holds no coordinates', () => {
  it('has no position to open', () => {
    expect(openCoordinates(sealField(JSON.stringify({ lat: '12.9' })))).toBeNull();
    expect(openCoordinates(sealField(JSON.stringify({ note: 'nothing here' })))).toBeNull();
  });
});

describe('an address hash without a server secret', () => {
  it('is not made up: with nothing to key it with there is no hash, so a search finds nothing', () => {
    Reflect.deleteProperty(process.env, 'JWT_SECRET');
    try {
      expect(hashIp('203.0.113.9')).toBeNull();
    } finally {
      process.env.JWT_SECRET = originalSecret ?? 'unit-test-secret';
    }
  });
});

describe('what is read off the request', () => {
  const request = (req: unknown, device_id: string | null = null) => ({ req, device_id }) as never;

  it('takes the address Express settled on, without the IPv4-in-IPv6 prefix, and the browser and device', () => {
    expect(
      requestFacts(request({ ip: '::ffff:203.0.113.9', headers: { 'user-agent': 'Mozilla/5.0 (X11)' } }, 'duid-1')),
    ).toEqual({ ip: '203.0.113.9', userAgent: 'Mozilla/5.0 (X11)', duid: 'duid-1' });
  });

  it('keeps no more of a browser string than it can use', () => {
    expect(requestFacts(request({ ip: '10.0.0.1', headers: { 'user-agent': 'x'.repeat(500) } })).userAgent).toHaveLength(300);
  });

  it('never takes an address from a header the caller can write', () => {
    const facts = requestFacts(request({ headers: { 'x-forwarded-for': '1.2.3.4', 'x-real-ip': '5.6.7.8' } }));
    expect(facts).toEqual({ ip: null, userAgent: null, duid: null });
  });

  it('copes with a request that has nothing on it, or an address that is not one', () => {
    expect(requestFacts(request(undefined))).toEqual({ ip: null, userAgent: null, duid: null });
    expect(requestFacts(request({ ip: 'not-an-address' })).ip).toBeNull();
  });
});

describe('the verification operations without a pending sign-in', () => {
  const ctx = (over: Record<string, unknown>) => ({ req: { headers: {} }, device_id: null, user: null, ...over }) as never;
  const input = {
    policy_version: 'v1',
    consent: { authorized_person: true, credentials_not_shared: true, policies_acknowledged: true, location_consent: true },
    location: { latitude: 12.9, longitude: 77.5, accuracy_meters: 10 },
  };

  it('refuse a caller who is not signed in at all', async () => {
    await expect(portalSecurityService.exceptionStatus(ctx({}))).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
  });

  it('tell a caller who is already in a session that nothing is waiting', async () => {
    await expect(portalSecurityService.exceptionStatus(ctx({ user: { id: 'u1', roles: [] } }))).rejects.toMatchObject({
      extensions: { code: 'BAD_REQUEST' },
    });
  });

  it('will not verify a sign-in whose address cannot be read, because the record would prove nothing', async () => {
    const pending = { userId: new Types.ObjectId().toString(), portal: 'finance', reverify: false };
    await expect(portalSecurityService.submit(ctx({ portalSecurity: pending }), input)).rejects.toMatchObject({
      message: expect.stringMatching(/network address/),
      extensions: { code: 'BAD_REQUEST' },
    });
  });
});

describe('how a person is named in the log', () => {
  it('uses their name, then their address, then nothing', () => {
    expect(displayName({ first_name: 'Asha', last_name: 'Rao', email: 'asha@duncit.com' })).toBe('Asha Rao');
    expect(displayName({ last_name: 'Rao' })).toBe('Rao');
    expect(displayName({ first_name: '  ', last_name: null, email: 'asha@duncit.com' })).toBe('asha@duncit.com');
    expect(displayName({ first_name: null, last_name: null, email: null })).toBe('');
    expect(displayName({})).toBe('');
  });
});

describe('a person who is not an account id', () => {
  it('is not on the team', async () => {
    await expect(employeeStanding('not-an-id')).resolves.toEqual(NOT_AN_EMPLOYEE);
    expect(NOT_AN_EMPLOYEE).toEqual({ is_employee: false, title: null, department: null, employment_type: null });
  });
});

describe('keeping the consent version current', () => {
  const policiesFound = (rows: Array<{ slug: string; content: string }>) =>
    jest.spyOn(PolicyModel, 'find').mockReturnValue({
      select: () => ({ sort: () => ({ lean: () => Promise.resolve(rows) }) }),
    } as never);

  it('publishes the version sessions are checked against: the notice version and a digest of the linked policies', async () => {
    policiesFound([{ slug: 'privacy', content: '<p>one</p>' }]);
    const version = await refreshPolicyVersion();
    expect(version.startsWith(`${PORTAL_SECURITY_NOTICE_VERSION}+`)).toBe(true);
    expect(version.split('+')[1]).toMatch(/^[0-9a-f]{8}$/);
    expect(isPortalSessionPending({ psv: verifiedClaim('finance', version) })).toBe(false);
    expect(isPortalSessionPending({ psv: verifiedClaim('finance', 'an-older-version') })).toBe(true);
  });

  it('changes when a linked policy is edited, and not when it is merely read again', async () => {
    policiesFound([{ slug: 'privacy', content: '<p>one</p>' }]);
    const first = await refreshPolicyVersion();
    expect(await refreshPolicyVersion()).toBe(first);

    policiesFound([{ slug: 'privacy', content: '<p>two</p>' }]);
    expect(await refreshPolicyVersion()).not.toBe(first);
  });

  it('is not started under test, so no timer is left running', () => {
    const timer = jest.spyOn(globalThis, 'setInterval');
    const stop = startPolicyVersionRefresh();
    expect(timer).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });

  it('re-reads every minute outside test, and stops when told to', async () => {
    process.env.NODE_ENV = 'production';
    jest.useFakeTimers();
    const find = policiesFound([]);

    const stop = startPolicyVersionRefresh();
    await jest.advanceTimersByTimeAsync(59_000);
    expect(find).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1_000);
    expect(find).toHaveBeenCalledTimes(1);

    stop();
    await jest.advanceTimersByTimeAsync(120_000);
    expect(find).toHaveBeenCalledTimes(1);
  });

  it('keeps the last known version, and says so, when a read fails — a blip must not ask everyone to verify again', async () => {
    process.env.NODE_ENV = 'production';
    jest.useFakeTimers();
    setCurrentPolicyVersion('last-known');
    const failure = new Error('mongo blinked');
    jest.spyOn(PolicyModel, 'find').mockImplementation(() => {
      throw failure;
    });
    const logged = jest.spyOn(logs.server, 'error').mockImplementation(() => undefined);

    const stop = startPolicyVersionRefresh();
    await jest.advanceTimersByTimeAsync(60_000);
    stop();

    expect(logged).toHaveBeenCalledWith('portal-security', 'policy-version-refresh', { error: failure });
    expect(isPortalSessionPending({ psv: verifiedClaim('finance', 'last-known') })).toBe(false);
  });

  it('copes with a timer that cannot be unreferenced', () => {
    process.env.NODE_ENV = 'production';
    jest.spyOn(globalThis, 'setInterval').mockReturnValue(7 as never);
    const cleared = jest.spyOn(globalThis, 'clearInterval').mockImplementation(() => undefined);

    startPolicyVersionRefresh()();

    expect(cleared).toHaveBeenCalledWith(7);
  });
});
