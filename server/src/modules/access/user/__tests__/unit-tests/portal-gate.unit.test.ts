import { assertPortalLogin } from '../../user.portalGate';
import { PORTAL_GATE_EXEMPT_KEYS, PORTAL_ROLE_REQUIREMENTS } from '../../user.constants';
import { loginSchema } from '../../user.validator';

describe('assertPortalLogin — server-side portal login gate', () => {
  it('allows login when portal_key is absent or blank', () => {
    expect(() => assertPortalLogin(undefined, ['USER'])).not.toThrow();
    expect(() => assertPortalLogin(null, ['USER'])).not.toThrow();
    expect(() => assertPortalLogin('', ['USER'])).not.toThrow();
    expect(() => assertPortalLogin('   ', ['USER'])).not.toThrow();
  });

  it('never gates the consumer/partner surfaces', () => {
    expect(Array.from(PORTAL_GATE_EXEMPT_KEYS).sort()).toEqual(['mweb', 'native', 'partners']);
    for (const key of PORTAL_GATE_EXEMPT_KEYS) {
      expect(() => assertPortalLogin(key, ['USER'])).not.toThrow();
    }
  });

  it('always allows SUPER_ADMIN into every mapped portal', () => {
    for (const key of Object.keys(PORTAL_ROLE_REQUIREMENTS)) {
      expect(() => assertPortalLogin(key, ['SUPER_ADMIN'])).not.toThrow();
    }
  });

  it('allows a user holding a role granted for the portal', () => {
    expect(() => assertPortalLogin('tech', ['USER', 'TECH_MANAGER'])).not.toThrow();
    expect(() => assertPortalLogin('website-app', ['WEBSITE_MANAGER'])).not.toThrow();
    expect(() => assertPortalLogin('admin', ['CITY_ADMIN'])).not.toThrow();
  });

  it('denies a user without any granted role for the portal (FORBIDDEN)', () => {
    expect(() => assertPortalLogin('tech', ['USER'])).toThrow(
      'You do not have access to this portal'
    );
    try {
      assertPortalLogin('finance', ['USER', 'HOST']);
      throw new Error('expected assertPortalLogin to throw');
    } catch (err: any) {
      expect(err.extensions?.code).toBe('FORBIDDEN');
    }
  });

  it('fails open for an unknown portal key (map not yet updated)', () => {
    expect(() => assertPortalLogin('brand-new-portal', ['USER'])).not.toThrow();
  });
});

describe('loginSchema — optional portal_key', () => {
  it('accepts a login payload without portal_key', async () => {
    const value = await loginSchema.validate({
      email: 'riya@duncit.com',
      password: 'StrongPass123',
    });
    expect(value.portal_key).toBeUndefined();
  });

  it('accepts and keeps a supplied portal_key', async () => {
    const value = await loginSchema.validate({
      email: 'riya@duncit.com',
      password: 'StrongPass123',
      portal_key: 'tech',
    });
    expect(value.portal_key).toBe('tech');
  });
});
