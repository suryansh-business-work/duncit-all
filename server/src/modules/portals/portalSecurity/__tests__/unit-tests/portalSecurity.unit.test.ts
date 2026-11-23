import jwt from 'jsonwebtoken';
import { decodeAuthUser, decodePendingPortalSession } from '@context';
import {
  isPortalSessionPending,
  pendingClaimFor,
  requiresPortalSecurity,
  setCurrentPolicyVersion,
  verifiedClaim,
} from '../../portalSecurity.claims';
import { PORTAL_SECURITY_RETENTION_DAYS } from '../../portalSecurity.constants';
import { hashIp, maskIp, normalizeIp, openCoordinates, sealCoordinates, sealField, openField } from '../../portalSecurity.crypto';
import { noticeSections } from '../../portalSecurity.policy';
import {
  exceptionDecisionSchema,
  exceptionRequestSchema,
  verificationInputSchema,
} from '../../portalSecurity.validator';
import { PORTAL_GATE_EXEMPT_KEYS, PORTAL_ROLE_REQUIREMENTS } from '../../../portal.constants';

afterEach(() => setCurrentPolicyVersion(null));

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

describe('which sign-ins go through the screen', () => {
  it('is every console the portal gate knows, and nothing else', () => {
    for (const key of Object.keys(PORTAL_ROLE_REQUIREMENTS)) {
      expect(requiresPortalSecurity(key)).toBe(true);
      expect(pendingClaimFor(key)).toEqual({ portal: key, verified: false });
    }
  });

  it.each([...PORTAL_GATE_EXEMPT_KEYS, '', '   ', null, undefined])('never asks it of %p (mWeb, native, the Partner portal, no console)', (key) => {
    expect(requiresPortalSecurity(key)).toBe(false);
    expect(pendingClaimFor(key)).toBeUndefined();
  });

  it('keeps the Partner portal out by name', () => {
    expect(PORTAL_GATE_EXEMPT_KEYS.has('partners')).toBe(true);
    expect(pendingClaimFor('partners')).toBeUndefined();
  });
});

describe('isPortalSessionPending', () => {
  it('leaves a token with no claim alone', () => {
    expect(isPortalSessionPending({})).toBe(false);
    expect(isPortalSessionPending(null)).toBe(false);
    expect(isPortalSessionPending({ psv: null })).toBe(false);
  });

  it('holds back a sign-in that has not completed the screen', () => {
    expect(isPortalSessionPending({ psv: { portal: 'finance', verified: false } })).toBe(true);
  });

  it.each([['a string', 'verified'], ['a number', 1], ['a claim with no portal', { verified: true }], ['a claim with no verified flag', { portal: 'finance' }]])(
    'does not trust %s as a claim',
    (_name, psv) => {
      expect(isPortalSessionPending({ psv })).toBe(true);
    }
  );

  it('accepts a verified claim while the terms are unchanged, and asks again when they change', () => {
    const claim = verifiedClaim('finance', 'v1');
    expect(claim).toMatchObject({ portal: 'finance', verified: true, policy: 'v1' });
    expect(typeof claim.at).toBe('number');

    setCurrentPolicyVersion('v1');
    expect(isPortalSessionPending({ psv: claim })).toBe(false);
    setCurrentPolicyVersion('v2');
    expect(isPortalSessionPending({ psv: claim })).toBe(true);
  });

  it('does not lock anyone out of a console just because the current terms are not known yet', () => {
    setCurrentPolicyVersion(null);
    expect(isPortalSessionPending({ psv: verifiedClaim('finance', 'whatever') })).toBe(false);
  });
});

describe('what the request context makes of the claim', () => {
  const secret = () => process.env.JWT_SECRET || 'dev-secret';
  const header = (claims: Record<string, unknown>, signWith = secret()) =>
    `Bearer ${jwt.sign({ id: 'u1', email: 'a@duncit.com', roles: ['USER'], ...claims }, signWith)}`;

  it('reads a pending console token as signed out, but remembers whose it is for the screen', () => {
    const authorization = header({ psv: { portal: 'tech', verified: false } });
    expect(decodeAuthUser(authorization)).toBeNull();
    expect(decodePendingPortalSession(authorization)).toMatchObject({ userId: 'u1', portal: 'tech', reverify: false });
  });

  it('reads a verified token as a session and not as pending', () => {
    setCurrentPolicyVersion('v1');
    const authorization = header({ psv: verifiedClaim('tech', 'v1') });
    expect(decodeAuthUser(authorization)).toMatchObject({ id: 'u1' });
    expect(decodePendingPortalSession(authorization)).toBeNull();
  });

  it('marks a verified token whose terms changed as owing the screen again', () => {
    setCurrentPolicyVersion('v2');
    const authorization = header({ psv: verifiedClaim('tech', 'v1') });
    expect(decodeAuthUser(authorization)).toBeNull();
    expect(decodePendingPortalSession(authorization)).toMatchObject({ portal: 'tech', reverify: true });
  });

  it('leaves tokens with no claim, and refuses forged or missing ones', () => {
    expect(decodeAuthUser(header({}))).toMatchObject({ id: 'u1' });
    expect(decodePendingPortalSession(header({}))).toBeNull();
    const forged = header({ psv: { portal: 'tech', verified: true, policy: 'v1' } }, 'another-secret');
    expect(decodeAuthUser(forged)).toBeNull();
    expect(decodePendingPortalSession(forged)).toBeNull();
    expect(decodePendingPortalSession(undefined)).toBeNull();
  });
});

describe('address handling', () => {
  it.each([
    ['::ffff:203.0.113.9', '203.0.113.9'],
    ['203.0.113.9', '203.0.113.9'],
    ['2401:4900:1c20::5', '2401:4900:1c20::5'],
    ['  10.0.0.1  ', '10.0.0.1'],
  ])('reads %s as an address', (raw, expected) => {
    expect(normalizeIp(raw)).toBe(expected);
  });

  it.each(['', '   ', 'not-an-ip', '999.1.1.1', '1.2.3', null, undefined])('does not read %p as an address', (raw) => {
    expect(normalizeIp(raw)).toBeNull();
  });

  it('hides the host part when it lists an address', () => {
    expect(maskIp('203.0.113.9')).toBe('203.0.x.x');
    expect(maskIp('2401:4900:1c20::5')).toBe('2401:4900:…');
  });

  it('hashes the same address the same way and different addresses differently', () => {
    expect(hashIp('203.0.113.9')).toBe(hashIp('203.0.113.9'));
    expect(hashIp('203.0.113.9')).not.toBe(hashIp('203.0.113.10'));
    expect(hashIp('203.0.113.9')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('sealing', () => {
  it('stores neither the address nor the coordinates in the clear, and opens them again', () => {
    const sealed = sealField('203.0.113.9');
    expect(sealed).not.toContain('203.0.113.9');
    expect(openField(sealed)).toBe('203.0.113.9');

    const coords = sealCoordinates({ lat: 12.9716, lng: 77.5946 });
    expect(coords).not.toContain('12.9716');
    expect(openCoordinates(coords)).toEqual({ lat: 12.9716, lng: 77.5946 });
  });

  it('seals the same value differently each time and refuses to open a tampered one', () => {
    expect(sealField('203.0.113.9')).not.toBe(sealField('203.0.113.9'));
    const sealed = sealField('203.0.113.9');
    const tampered = `${sealed.slice(0, -4)}AAAA`;
    expect(() => openField(tampered)).toThrow();
  });

  it('has no coordinates to open for a row with none', () => {
    expect(openCoordinates(null)).toBeNull();
    expect(openCoordinates('')).toBeNull();
  });
});

describe('the wording the screen shows', () => {
  const sections = noticeSections('support@duncit.com');
  const text = sections.flatMap((section) => section.paragraphs).join(' ');

  it('covers every topic the screen has to cover', () => {
    expect(sections.map((section) => section.key)).toEqual([
      'security',
      'access',
      'credentials',
      'acceptable_use',
      'monitoring',
      'location_notice',
      'privacy',
    ]);
  });

  it('states the retention the system actually enforces, and a real way to withdraw consent', () => {
    expect(text).toContain(`${PORTAL_SECURITY_RETENTION_DAYS} days`);
    expect(text).toContain('support@duncit.com');
    expect(text).toMatch(/withdraw/i);
    expect(text).toMatch(/Digital Personal Data Protection Act, 2023/);
  });

  it('says plainly that the place worked out from an address is not a position', () => {
    expect(text).toMatch(/only an approximation/i);
  });
});

describe('what the screen is allowed to send', () => {
  const good = {
    policy_version: 'v1',
    consent: { authorized_person: true, credentials_not_shared: true, policies_acknowledged: true, location_consent: true },
    location: { latitude: 28.6139, longitude: 77.209, accuracy_meters: 12 },
  };
  const messages = (input: unknown) => {
    const result = verificationInputSchema.safeParse(input);
    return result.success ? [] : result.error.issues.map((issue) => issue.message);
  };

  it('accepts a complete verification', () => {
    expect(verificationInputSchema.safeParse(good).success).toBe(true);
  });

  it.each([
    ['authorized_person', /authorised Duncit employee/],
    ['credentials_not_shared', /not shared your login credentials/],
    ['policies_acknowledged', /Acknowledge the security monitoring/],
  ])('requires %s to be ticked', (key, message) => {
    expect(messages({ ...good, consent: { ...good.consent, [key]: false } }).join(' ')).toMatch(message);
  });

  it('requires a location and its consent unless an approved alternative is used', () => {
    expect(messages({ ...good, location: null })).toEqual(['Your current location is required to verify']);
    expect(messages({ ...good, consent: { ...good.consent, location_consent: false } })[0]).toMatch(/Consent to share your current location/);
    const withException = { ...good, location: null, exception_id: '64b7f0f2a1b2c3d4e5f60718', consent: { ...good.consent, location_consent: false } };
    expect(verificationInputSchema.safeParse(withException).success).toBe(true);
  });

  it.each([
    [{ latitude: -90.0001 }, /latitude/],
    [{ latitude: 90.0001 }, /latitude/],
    [{ longitude: 180.5 }, /longitude/],
    [{ longitude: -181 }, /longitude/],
    [{ accuracy_meters: -0.1 }, /accuracy/],
    [{ accuracy_meters: 2_000_000 }, /accuracy/],
    [{ latitude: Number.NaN }, /latitude/],
  ])('refuses the coordinates %p', (over, message) => {
    expect(messages({ ...good, location: { ...good.location, ...over } }).join(' ')).toMatch(message);
  });

  it('accepts the edges of the world', () => {
    for (const location of [
      { latitude: 90, longitude: 180, accuracy_meters: 0 },
      { latitude: -90, longitude: -180, accuracy_meters: 1_000_000 },
    ]) {
      expect(verificationInputSchema.safeParse({ ...good, location }).success).toBe(true);
    }
  });

  it('refuses a malformed exception id and a missing policy version', () => {
    expect(messages({ ...good, exception_id: 'xyz' })).toContain('exception_id is not valid');
    expect(messages({ ...good, policy_version: '  ' }).join(' ')).toMatch(/policy_version/);
  });

  it('keeps the reason for an alternative between the limits, trimmed', () => {
    expect(exceptionRequestSchema.safeParse({ reason: '   too short ' }).success).toBe(false);
    expect(exceptionRequestSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false);
    const ok = exceptionRequestSchema.parse({ reason: '  The browser has no location service  ', location_error: 'UNSUPPORTED' });
    expect(ok.reason).toBe('The browser has no location service');
    expect(exceptionRequestSchema.safeParse({ reason: 'long enough reason', location_error: 'SOMETHING_ELSE' }).success).toBe(false);
  });

  it('needs an id and a yes or no to decide a request', () => {
    expect(exceptionDecisionSchema.safeParse({ id: 'nope', approve: true }).success).toBe(false);
    expect(exceptionDecisionSchema.safeParse({ id: '64b7f0f2a1b2c3d4e5f60718' }).success).toBe(false);
    expect(exceptionDecisionSchema.parse({ id: '64b7f0f2a1b2c3d4e5f60718', approve: false, note: '  no  ' }).note).toBe('no');
  });
});
