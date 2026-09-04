import { afterEach, describe, expect, it, vi } from 'vitest';
import { appConfig } from '../../src/config/app-config';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('Duncit Legal app config', () => {
  it('declares the expected identity', () => {
    expect(appConfig.key).toBe('legal');
    expect(appConfig.name).toBe('Legal');
    expect(appConfig.fullName).toBe('Duncit Legal');
    expect(appConfig.tokenKey).toBe('legal_token');
    expect(appConfig.colorModeKey).toBe('legal_color_mode');
  });

  it('gates on the LEGAL_MANAGER role by default', () => {
    expect(appConfig.requiredRoles).toEqual(['LEGAL_MANAGER']);
  });

  // Every destination this console offers, in order, including the ones
  // reached through the Grievance group. Listed in full rather than spot-
  // checked: the nav IS the console, and a route that quietly disappears is
  // exactly what this should fail on.
  it('offers every legal section, groups included', () => {
    const targets = appConfig.nav.flatMap((n) => (n.to ? [n.to] : (n.children ?? []).map((c) => c.to)));
    expect(targets).toEqual([
      '/',
      '/documents',
      '/policies',
      '/policy-acceptance-logs',
      '/contracts',
      '/reports',
      '/grievance/tickets',
      '/grievance/info',
    ]);
    expect(appConfig.nav.find((n) => n.to === '/')?.label).toBe('Dashboard');
  });

  it('honours VITE_REQUIRED_ROLES when provided', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'LEGAL_MANAGER, SUPER_ADMIN');
    vi.resetModules();
    const mod = await import('../../src/config/app-config');
    expect(mod.appConfig.requiredRoles).toEqual(['LEGAL_MANAGER', 'SUPER_ADMIN']);
  });
});
