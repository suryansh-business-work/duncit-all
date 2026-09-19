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

describe('Club Admins console app config', () => {
  it('declares its identity, storage keys and one dashboard entry', async () => {
    const appConfig = await loadConfig();
    expect(appConfig.key).toBe('club-admins');
    expect(appConfig.fullName).toBe('Duncit Club Admins');
    expect(appConfig.tokenKey).toBe('club_admins_token');
    expect(appConfig.colorModeKey).toBe('club_admins_color_mode');
    expect(appConfig.nav.map((item) => item.to)).toEqual(['/']);
  });

  it('gates on its default roles and ships its own login image by default', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', '');
    vi.stubEnv('VITE_LOGIN_IMAGE', '');
    const appConfig = await loadConfig();
    expect(appConfig.requiredRoles).toEqual(['ALL_CLUB_ADMINS_ACCESS']);
    expect(appConfig.loginImage).toBe('https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg');
  });

  it('honours the environment overrides for roles and the login image', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'ALL_CLUB_ADMINS_ACCESS, SUPER_ADMIN');
    vi.stubEnv('VITE_LOGIN_IMAGE', 'https://cdn.duncit.com/login/club-admins.jpg');
    const appConfig = await loadConfig();
    expect(appConfig.requiredRoles).toEqual(['ALL_CLUB_ADMINS_ACCESS', 'SUPER_ADMIN']);
    expect(appConfig.loginImage).toBe('https://cdn.duncit.com/login/club-admins.jpg');
  });
});
