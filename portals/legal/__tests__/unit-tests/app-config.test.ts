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

  it('exposes the dashboard, documents and policies sections', () => {
    const targets = appConfig.nav.map((n) => n.to);
    expect(targets).toEqual(['/', '/documents', '/policies']);
    expect(appConfig.nav.find((n) => n.to === '/')?.label).toBe('Dashboard');
  });

  it('honours VITE_REQUIRED_ROLES when provided', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'LEGAL_MANAGER, SUPER_ADMIN');
    vi.resetModules();
    const mod = await import('../../src/config/app-config');
    expect(mod.appConfig.requiredRoles).toEqual(['LEGAL_MANAGER', 'SUPER_ADMIN']);
  });
});
