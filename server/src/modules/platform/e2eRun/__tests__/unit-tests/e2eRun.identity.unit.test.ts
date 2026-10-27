import { buildIdentity, identityStamp, runAccountMatcher, stampTime } from '../../e2eRun.identity';
import { e2eSignature, isE2eSignature } from '../../e2eRun.signature';

describe('identityStamp / stampTime', () => {
  it('writes the instant as ddMMyyyyHHmm in the platform zone (IST by default) and reads it back', () => {
    const at = new Date('2026-09-06T21:30:00Z');
    expect(identityStamp(at)).toBe('070920260300');
    expect(stampTime('070920260300')?.toISOString()).toBe('2026-09-06T21:30:00.000Z');
  });

  it('honours another zone', () => {
    const at = new Date('2026-09-07T03:00:00Z');
    expect(identityStamp(at, 'UTC')).toBe('070920260300');
    expect(stampTime('070920260300', 'UTC')?.toISOString()).toBe('2026-09-07T03:00:00.000Z');
  });

  it.each(['', 'abc', '07092026030', '0709202603000', '07-09-2026 03:00'])('is not a stamp: %p', (value) => {
    expect(stampTime(value)).toBeNull();
  });

  it('is not a stamp when the digits name no real moment', () => {
    expect(stampTime('999999999999')).toBeNull();
  });
});

describe('buildIdentity', () => {
  const seed = { email_prefix: ' suryansh+ ', email_domain: '@gmail.com ', password: ' pw ', identity_phone: ' 919876543210 ' };
  const AT = new Date('2026-09-06T21:30:00Z');

  it('builds the run account from the operator seed, trimmed, with the stamp in the address', () => {
    expect(buildIdentity(seed, AT)).toEqual({
      stamp: '070920260300', login_email: 'suryansh+070920260300@gmail.com', signup_email: 'suryansh+070920260300@gmail.com', password: 'pw', phone: '919876543210',
    });
  });

  it.each([
    [{ ...seed, email_prefix: '  ' }],
    [{ ...seed, email_domain: '@' }],
    [{ ...seed, email_prefix: '', email_domain: '' }],
  ])('is null when the seed has no usable address (%j)', (bad) => {
    expect(buildIdentity(bad, AT)).toBeNull();
  });

  it('tolerates a missing password and phone', () => {
    expect(buildIdentity({ ...seed, password: undefined as never, identity_phone: null as never }, AT)).toMatchObject({ password: '', phone: '' });
  });
});

describe('runAccountMatcher', () => {
  const matcher = runAccountMatcher({ email_prefix: 'admin+', email_domain: 'duncit.com', password: '', identity_phone: '+91 98765-43210' });

  it('is null without a prefix or domain', () => {
    expect(runAccountMatcher({ email_prefix: '', email_domain: 'd.com', password: '', identity_phone: '' })).toBeNull();
    expect(runAccountMatcher({ email_prefix: 'a', email_domain: '', password: '', identity_phone: '' })).toBeNull();
  });

  it('matches a stamped address, with or without a scenario suffix, in any case', () => {
    expect(matcher?.email.test('admin+070920260300@duncit.com')).toBe(true);
    expect(matcher?.email.test('Admin+070920260300-new@Duncit.com')).toBe(true);
  });

  it('never matches a real account that merely shares the prefix, or an address with a different shape', () => {
    expect(matcher?.email.test('admin@duncit.com')).toBe(false);
    expect(matcher?.email.test('admin+1234@duncit.com')).toBe(false);
    expect(matcher?.email.test('admin+070920260300@evil.com')).toBe(false);
    expect(matcher?.email.test('xadmin+070920260300@duncit.com')).toBe(false);
    expect(matcher?.email.test('admin+070920260300-@duncit.com')).toBe(false);
  });

  it('reduces the phone to digits, and has none when none is set', () => {
    expect(matcher?.phone).toBe('919876543210');
    expect(runAccountMatcher({ email_prefix: 'a', email_domain: 'd.com', password: '', identity_phone: '' })?.phone).toBe('');
  });

  it('treats a + or . in the prefix and domain as literal characters', () => {
    const m = runAccountMatcher({ email_prefix: 'a.b+', email_domain: 'x.com', password: '', identity_phone: '' });
    expect(m?.email.test('a.b+070920260300@x.com')).toBe(true);
    expect(m?.email.test('aXb+070920260300@x.com')).toBe(false);
    expect(m?.email.test('a.b+070920260300@xYcom')).toBe(false);
  });
});

describe('e2eSignature', () => {
  it('is stable for a label and value, and different for another label or value', () => {
    expect(e2eSignature('traffic', 'v')).toBe(e2eSignature('traffic', 'v'));
    expect(e2eSignature('traffic', 'v')).not.toBe(e2eSignature('google', 'v'));
    expect(e2eSignature('traffic', 'v')).not.toBe(e2eSignature('traffic', 'w'));
    expect(e2eSignature('traffic', 'v')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('verifies only the exact signature it derived, in constant time', () => {
    const mac = e2eSignature('traffic', 'v');
    expect(isE2eSignature('traffic', 'v', mac)).toBe(true);
    expect(isE2eSignature('google', 'v', mac)).toBe(false);
    expect(isE2eSignature('traffic', 'v', mac.slice(0, -1))).toBe(false);
    expect(isE2eSignature('traffic', 'v', `${mac}0`)).toBe(false);
    expect(isE2eSignature('traffic', 'v', '')).toBe(false);
    expect(isE2eSignature('traffic', 'v', `${mac.slice(0, -1)}${mac.endsWith('0') ? '1' : '0'}`)).toBe(false);
  });

  it('signs with the server secret, so a different secret signs differently', () => {
    const saved = process.env.JWT_SECRET;
    const a = e2eSignature('l', 'v');
    process.env.JWT_SECRET = 'another-secret';
    try {
      expect(e2eSignature('l', 'v')).not.toBe(a);
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });

  it('falls back to a development secret when none is configured', () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      expect(e2eSignature('l', 'v')).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });
});
