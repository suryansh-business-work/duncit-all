import { afterEach, describe, expect, it, vi } from 'vitest';

// The config reads `parseEnvRoles` and nothing else from the shell; the REAL
// function, straight from its source, keeps each re-import below cheap. The
// config is re-evaluated per case because it reads the environment at import.
vi.mock('@duncit/shell', async () => {
  const { parseEnvRoles } = await import('../../../../../packages/shell/src/lib/env-roles');
  return { parseEnvRoles };
});

const loadConfig = async () => {
  vi.resetModules();
  return (await import('../../../src/config/app-config')).appConfig;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Analytics console app config', () => {
  it('declares its identity and storage keys', async () => {
    const appConfig = await loadConfig();
    expect(appConfig.key).toBe('analytics');
    expect(appConfig.fullName).toBe('Duncit Analytics');
    expect(appConfig.tokenKey).toBe('analytics_token');
    expect(appConfig.colorModeKey).toBe('analytics_color_mode');
  });

  it('lists one dashboard per subject and nothing else', async () => {
    const appConfig = await loadConfig();
    expect(appConfig.nav.map((item) => item.to)).toEqual(['/users', '/pods', '/clubs', '/club-admins', '/hosts']);
  });

  it('gates on ANALYTICS_MANAGER and ships its own login image by default', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', '');
    vi.stubEnv('VITE_LOGIN_IMAGE', '');
    const appConfig = await loadConfig();
    expect(appConfig.requiredRoles).toEqual(['ANALYTICS_MANAGER']);
    expect(appConfig.loginImage).toBe('https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg');
  });

  it('honours the environment overrides for roles and the login image', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'ANALYTICS_MANAGER, SUPER_ADMIN');
    vi.stubEnv('VITE_LOGIN_IMAGE', 'https://cdn.duncit.com/login/analytics.jpg');
    const appConfig = await loadConfig();
    expect(appConfig.requiredRoles).toEqual(['ANALYTICS_MANAGER', 'SUPER_ADMIN']);
    expect(appConfig.loginImage).toBe('https://cdn.duncit.com/login/analytics.jpg');
  });
});
