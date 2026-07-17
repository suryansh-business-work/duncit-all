import { afterEach, describe, expect, it, vi } from 'vitest';
// Preload the module graph (@duncit/shell is heavy) during collection so the
// dynamic re-imports below only re-evaluate cached transforms.
import '../../src/config/app-config';

describe('appConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses the default required role and login image when env vars are unset', async () => {
    vi.resetModules();
    const { appConfig } = await import('../../src/config/app-config');
    expect(appConfig.key).toBe('tech');
    expect(appConfig.requiredRoles).toEqual(['TECH_MANAGER']);
    expect(appConfig.loginImage).toMatch(/pexels/);
  });

  it('honours VITE_REQUIRED_ROLES and VITE_LOGIN_IMAGE overrides', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'ALPHA, BETA ,');
    vi.stubEnv('VITE_LOGIN_IMAGE', 'https://img.test/x.png');
    vi.resetModules();
    const { appConfig } = await import('../../src/config/app-config');
    expect(appConfig.requiredRoles).toEqual(['ALPHA', 'BETA']);
    expect(appConfig.loginImage).toBe('https://img.test/x.png');
  });
});
