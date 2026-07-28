import {
  assertPortalLogin,
  PORTAL_GATE_EXEMPT_KEYS,
  PORTAL_ROLE_REQUIREMENTS,
} from '@modules/portals';
import { loginSchema } from '@modules/access/auth/auth.validator';

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

  it('fails CLOSED for an unknown portal key (map not yet updated)', () => {
    expect(() => assertPortalLogin('brand-new-portal', ['USER'])).toThrow(
      'You do not have access to this portal'
    );
    try {
      assertPortalLogin('brand-new-portal', ['TECH_MANAGER']);
      throw new Error('expected assertPortalLogin to throw');
    } catch (err: any) {
      expect(err.extensions?.code).toBe('FORBIDDEN');
    }
  });

  it('still lets SUPER_ADMIN into an unknown portal key', () => {
    expect(() => assertPortalLogin('brand-new-portal', ['SUPER_ADMIN'])).not.toThrow();
  });

  it('covers every portal key the clients ship with a map or exempt entry', () => {
    // Fail-closed only works if the server map stays in step with the portal
    // clients' own appConfig.key values (portals/<name>/src/config/app-config.ts).
    const shippedPortalKeys = [
      'admin', 'ads', 'ai', 'challenge', 'crm', 'developers', 'employee',
      'finance', 'hr', 'legal', 'marketing', 'onboarding', 'partners',
      'products', 'support', 'tech', 'website-app',
    ];
    for (const key of shippedPortalKeys) {
      const known = PORTAL_GATE_EXEMPT_KEYS.has(key) || Boolean(PORTAL_ROLE_REQUIREMENTS[key]);
      expect({ key, known }).toEqual({ key, known: true });
    }
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
