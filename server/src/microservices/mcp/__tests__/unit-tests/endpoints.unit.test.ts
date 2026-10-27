import { PORTAL_GATE_EXEMPT_KEYS, PORTAL_ROLE_REQUIREMENTS } from '@modules/portals/portal.constants';
import { GATEWAY_ENDPOINT } from '../../mcp.constants';
import { MCP_CATEGORIES } from '../../catalog/categories';
import { accessibleEndpoints, endpointPath, endpointsForCategory, findEndpoint, MCP_ENDPOINTS } from '../../catalog/endpoints';

const keysFor = (roles: string[]) => accessibleEndpoints(roles).map((endpoint) => endpoint.key);

describe('MCP_ENDPOINTS', () => {
  it('has unique, URL-safe keys, none of which is the gateway', () => {
    const keys = MCP_ENDPOINTS.map((endpoint) => endpoint.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key).toMatch(/^[a-z0-9-]+$/);
      expect(key).not.toBe(GATEWAY_ENDPOINT);
    }
  });

  it('gates every endpoint on a portal the login gate knows (an unknown key would fail closed for everyone)', () => {
    for (const endpoint of MCP_ENDPOINTS) {
      const known = PORTAL_GATE_EXEMPT_KEYS.has(endpoint.portal) || endpoint.portal in PORTAL_ROLE_REQUIREMENTS;
      expect({ endpoint: endpoint.key, known }).toEqual({ endpoint: endpoint.key, known: true });
    }
  });

  it('serves every category on at least one endpoint', () => {
    for (const category of MCP_CATEGORIES) {
      expect({ category: category.key, served: endpointsForCategory(category.key).length > 0 }).toEqual({
        category: category.key,
        served: true,
      });
    }
  });

  it('only names categories that exist', () => {
    const known = new Set<string>(MCP_CATEGORIES.map((category) => category.key));
    for (const endpoint of MCP_ENDPOINTS) for (const category of endpoint.categories) expect(known.has(category)).toBe(true);
  });
});

describe('findEndpoint', () => {
  it('finds an endpoint by key', () => {
    expect(findEndpoint('finance')).toMatchObject({ key: 'finance', label: 'Finance', portal: 'finance', categories: ['finance'] });
  });

  it('has no entry for the gateway or an unknown key', () => {
    expect(findEndpoint(GATEWAY_ENDPOINT)).toBeUndefined();
    expect(findEndpoint('nope')).toBeUndefined();
  });
});

describe('accessibleEndpoints', () => {
  it('opens every endpoint for a super admin', () => {
    expect(keysFor(['SUPER_ADMIN'])).toEqual(MCP_ENDPOINTS.map((endpoint) => endpoint.key));
  });

  it('opens only the member and partner apps, and Duncit Lite, for a plain member', () => {
    expect(keysFor([])).toEqual(['app', 'partners', 'lite']);
  });

  it('adds the finance and loyalty consoles for a finance manager, but not Admin (which wants FINANCE_USER)', () => {
    expect(keysFor(['FINANCE_MANAGER'])).toEqual(['app', 'partners', 'finance', 'loyalty']);
  });

  it('opens Admin, Finance and Loyalty for a finance user, as the console logins do', () => {
    expect(keysFor(['FINANCE_USER'])).toEqual(['admin', 'app', 'partners', 'finance', 'loyalty']);
  });

  it('opens only the loyalty console for a loyalty manager', () => {
    expect(keysFor(['LOYALTY_MANAGER'])).toEqual(['app', 'partners', 'loyalty']);
  });

  it('opens the MCP console for an MCP user', () => {
    expect(keysFor(['MCP_USER'])).toEqual(['app', 'partners', 'mcp']);
  });

  it('opens both consoles a role is listed on (onboarding managers reach hosts and venues too)', () => {
    expect(keysFor(['ONBOARDING_MANAGER'])).toEqual(['app', 'partners', 'venues', 'hosts', 'onboarding']);
  });
});

describe('endpointsForCategory', () => {
  it('lists every endpoint serving pods', () => {
    expect(endpointsForCategory('pods')).toEqual(['admin', 'app', 'partners', 'pods', 'regional-club-admin']);
  });

  it('keeps finance on the Finance console only', () => {
    expect(endpointsForCategory('finance')).toEqual(['finance']);
  });

  it('serves logs on both Logs and Tech', () => {
    expect(endpointsForCategory('logs')).toEqual(['logs', 'tech']);
  });
});

describe('endpointPath', () => {
  it('serves the gateway at /mcp', () => {
    expect(endpointPath(GATEWAY_ENDPOINT)).toBe('/mcp');
  });

  it('serves every other endpoint at /<key>/mcp', () => {
    expect(endpointPath('pods')).toBe('/pods/mcp');
    expect(endpointPath('regional-club-admin')).toBe('/regional-club-admin/mcp');
  });
});
