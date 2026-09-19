import { afterEach, describe, expect, it, vi } from 'vitest';

// The config reads `parseEnvRoles` and nothing else from the shell. Handing it
// the REAL function straight from its source keeps each re-import below cheap:
// the config is re-evaluated per test because it reads the environment once,
// at import time.
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

describe('Regional Club Admin app config', () => {
  it('declares the console identity, token keys and accent', async () => {
    const appConfig = await loadConfig();
    expect(appConfig.key).toBe('regional-club-admin');
    expect(appConfig.fullName).toBe('Duncit Regional Club Admin');
    expect(appConfig.tokenKey).toBe('regional_club_admin_token');
    expect(appConfig.colorModeKey).toBe('regional_club_admin_color_mode');
    expect(appConfig.accent.main).toBe('#ef4444');
  });

  it('offers the canvas and the Club Admins list, in that order', async () => {
    const appConfig = await loadConfig();
    expect(appConfig.nav.map((item) => item.to)).toEqual(['/', '/club-admins']);
    expect(appConfig.nav.map((item) => item.labelKey)).toEqual([
      'shell.nav.regionStructure',
      'shell.nav.clubAdmins',
    ]);
  });

  it('gates on REGIONAL_CLUB_ADMIN and ships its own login image by default', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', '');
    vi.stubEnv('VITE_LOGIN_IMAGE', '');
    const appConfig = await loadConfig();
    expect(appConfig.requiredRoles).toEqual(['REGIONAL_CLUB_ADMIN']);
    expect(appConfig.loginImage).toBe('https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg');
  });

  it('honours the environment overrides for roles and the login image', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'REGIONAL_CLUB_ADMIN, SUPER_ADMIN');
    vi.stubEnv('VITE_LOGIN_IMAGE', 'https://cdn.duncit.com/login/regional.jpg');
    const appConfig = await loadConfig();
    expect(appConfig.requiredRoles).toEqual(['REGIONAL_CLUB_ADMIN', 'SUPER_ADMIN']);
    expect(appConfig.loginImage).toBe('https://cdn.duncit.com/login/regional.jpg');
  });
});
