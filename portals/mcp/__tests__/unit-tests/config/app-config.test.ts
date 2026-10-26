import { describe, expect, it, vi } from 'vitest';
import { flattenCatalogue, SHELL_BUNDLE } from '@duncit/app-settings';

/** The module computes its roles at load time, so each case loads a fresh copy. */
async function loadConfig() {
  vi.resetModules();
  return import('../../../src/config/app-config');
}

describe('MCP app config', () => {
  it('is the mcp console, with its own token and colour-mode keys', async () => {
    const { appConfig } = await loadConfig();
    expect(appConfig.key).toBe('mcp');
    expect(appConfig.tokenKey).toBe('mcp_token');
    expect(appConfig.colorModeKey).toBe('mcp_color_mode');
  });

  it('lets MCP managers and MCP users in by default', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', '');
    const { appConfig } = await loadConfig();
    expect(appConfig.requiredRoles).toEqual(['MCP_MANAGER', 'MCP_USER']);
  });

  it('takes its roles from VITE_REQUIRED_ROLES when the build sets them', async () => {
    vi.stubEnv('VITE_REQUIRED_ROLES', 'MCP_MANAGER, TECH_MANAGER');
    const { appConfig } = await loadConfig();
    expect(appConfig.requiredRoles).toEqual(['MCP_MANAGER', 'TECH_MANAGER']);
  });

  it('treats a super admin and an MCP manager as managers, and lets the build name others', async () => {
    vi.stubEnv('VITE_MANAGER_ROLES', '');
    expect((await loadConfig()).managerRoles).toEqual(['SUPER_ADMIN', 'MCP_MANAGER']);
    vi.stubEnv('VITE_MANAGER_ROLES', 'MCP_LEAD');
    expect((await loadConfig()).managerRoles).toEqual(['SUPER_ADMIN', 'MCP_LEAD']);
  });

  it('lists the seven screens, Settings among them at its own path', async () => {
    const { appConfig, SETTINGS_PATH } = await loadConfig();
    expect(appConfig.nav.map((item) => item.to)).toEqual([
      '/',
      '/activity',
      '/tools',
      '/connect',
      '/connections',
      '/settings',
      '/guide',
    ]);
    expect(SETTINGS_PATH).toBe('/settings');
  });

  it('names every sidebar entry and login line by a key the shell bundle ships', async () => {
    const { appConfig } = await loadConfig();
    const shipped = flattenCatalogue(SHELL_BUNDLE);
    const keys = [
      ...appConfig.nav.map((item) => item.labelKey),
      appConfig.taglineKey,
      appConfig.promoTitleKey,
      appConfig.promoTextKey,
    ];
    for (const key of keys) expect(shipped[key], key).toBeTruthy();
  });
});
