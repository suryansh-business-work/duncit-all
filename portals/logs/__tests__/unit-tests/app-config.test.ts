import { afterEach, describe, expect, it, vi } from 'vitest';

// The config reads `parseEnvRoles` and nothing else from the shell; the REAL
// function, straight from its source, keeps each re-import below cheap. The
// config is re-evaluated per case because it reads the environment at import.
vi.mock('@duncit/shell', async () => {
  const { parseEnvRoles } = await import('../../../../packages/shell/src/lib/env-roles');
  return { parseEnvRoles };
});

const loadConfig = async () => {
  vi.resetModules();
  return (await import('../../src/config/app-config')).appConfig;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Logs console app config', () => {
  it('declares its identity, storage keys and one dashboard entry', async () => {
    const appConfig = await loadConfig();
    expect(appConfig.key).toBe('logs');
    expect(appConfig.fullName).toBe('Duncit Logs');
    expect(appConfig.tokenKey).toBe('logs_token');
    expect(appConfig.colorModeKey).toBe('logs_color_mode');
    expect(appConfig.nav.map((item) => item.to)).toEqual(['/']);
  });

  it('gates on its default roles and ships its own login image by default', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', '');
    vi.stubEnv('VITE_LOGIN_IMAGE', '');
    const appConfig = await loadConfig();
    expect(appConfig.requiredRoles).toEqual(['LOGS_MANAGER']);
    expect(appConfig.loginImage).toBe('https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg');
  });

  it('honours the environment overrides for roles and the login image', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'LOGS_MANAGER, SUPER_ADMIN');
    vi.stubEnv('VITE_LOGIN_IMAGE', 'https://cdn.duncit.com/login/logs.jpg');
    const appConfig = await loadConfig();
    expect(appConfig.requiredRoles).toEqual(['LOGS_MANAGER', 'SUPER_ADMIN']);
    expect(appConfig.loginImage).toBe('https://cdn.duncit.com/login/logs.jpg');
  });
});
