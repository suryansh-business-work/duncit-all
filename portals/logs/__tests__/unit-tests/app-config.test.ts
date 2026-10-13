import { afterEach, describe, expect, it, vi } from 'vitest';

// The config reads `parseEnvRoles` and nothing else from the shell; the REAL
// function, straight from its source, keeps each re-import below cheap. The
// config is re-evaluated per case because it reads the environment at import.
vi.mock('@duncit/shell', async () => {
  const { parseEnvRoles } = await import('../../../../packages/shell/src/lib/env-roles');
  return { parseEnvRoles };
});

interface NavNode {
  label: string;
  to?: string;
  children?: NavNode[];
}

/** Every routed path under a nav tree, depth first. */
const flatten = (nodes: NavNode[]): string[] =>
  nodes.flatMap((node) => (node.children ? flatten(node.children) : node.to ? [node.to] : []));

const loadConfig = async () => {
  vi.resetModules();
  return (await import('../../src/config/app-config')).appConfig;
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Logs console app config', () => {
  it('declares its identity and storage keys', async () => {
    const appConfig = await loadConfig();
    expect(appConfig.key).toBe('logs');
    expect(appConfig.fullName).toBe('Duncit Logs');
    expect(appConfig.tokenKey).toBe('logs_token');
    expect(appConfig.colorModeKey).toBe('logs_color_mode');
  });

  it('opens on the dashboard, then groups every borrowed log under its console', async () => {
    const { nav } = (await loadConfig()) as unknown as { nav: NavNode[] };
    expect(nav[0]).toMatchObject({ to: '/', label: 'Dashboard' });
    expect(nav.slice(1).map((group) => group.label)).toEqual([
      'Tech',
      'AI',
      'Communications',
      'Finance',
      'Legal',
      'Pods',
    ]);
    // A group is a folder, not a page: only its leaves are routes.
    for (const group of nav.slice(1)) {
      expect(group.to).toBeUndefined();
      expect(group.children?.length).toBeGreaterThan(0);
    }
  });

  it('routes every leaf to a distinct path', async () => {
    const { nav } = (await loadConfig()) as unknown as { nav: NavNode[] };
    const leaves = flatten(nav);
    expect(leaves).toEqual(
      expect.arrayContaining([
        '/',
        '/telemetry/logs',
        '/emails/logs',
        '/msg91-otp/settings',
        '/payment-logs',
        '/policy-acceptance-logs',
        '/pod-monitoring',
      ]),
    );
    expect(new Set(leaves).size).toBe(leaves.length);
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
