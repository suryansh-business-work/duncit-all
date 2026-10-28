import { hasPortalAccess } from '@modules/portals/portal.gate';
import { GATEWAY_ENDPOINT, MCP_PORTAL_KEY } from '../mcp.constants';
import type { McpCategoryKey } from './categories';

/**
 * The connector URLs. Each portal has its own — `https://mcp.duncit.com/<key>/mcp`
 * — serving the categories that console owns, so an AI client connected for
 * finance work sees finance tools and nothing else. The gateway at `/mcp`
 * serves every endpoint the person can open, through search-and-call tools
 * rather than two thousand entries in one list.
 *
 * `portal` is the console whose access decides whether the endpoint opens
 * (hasPortalAccess, the same check the console login makes). `mweb` and
 * `partners` are the member and partner apps, open to every signed-in account;
 * the resolvers behind each tool still decide what that account may actually do.
 */

export interface McpEndpoint {
  key: string;
  label: string;
  portal: string;
  categories: readonly McpCategoryKey[];
}

export const MCP_ENDPOINTS: readonly McpEndpoint[] = [
  { key: 'admin', label: 'Admin', portal: 'admin', categories: ['users', 'platform', 'pods', 'clubs', 'venues', 'hosts', 'engagement', 'moderation'] },
  { key: 'app', label: 'Duncit app (member)', portal: 'mweb', categories: ['account', 'pods', 'clubs', 'engagement', 'chat', 'support', 'legal'] },
  { key: 'partners', label: 'Partners app', portal: 'partners', categories: ['venues', 'hosts', 'partner-brand', 'gig-jobs', 'pods', 'clubs'] },
  { key: 'pods', label: 'Pods console', portal: 'pods', categories: ['pods'] },
  { key: 'clubs', label: 'Clubs console', portal: 'clubs', categories: ['clubs'] },
  { key: 'club-admins', label: 'Club Admins console', portal: 'club-admins', categories: ['clubs'] },
  { key: 'regional-club-admin', label: 'Regional Club Admin', portal: 'regional-club-admin', categories: ['clubs', 'pods'] },
  { key: 'venues', label: 'Venues console', portal: 'venues', categories: ['venues'] },
  { key: 'hosts', label: 'Hosts console', portal: 'hosts', categories: ['hosts'] },
  { key: 'finance', label: 'Finance', portal: 'finance', categories: ['finance'] },
  { key: 'loyalty', label: 'Loyalty', portal: 'loyalty', categories: ['loyalty'] },
  { key: 'employee', label: 'Employee', portal: 'employee', categories: ['employee'] },
  { key: 'hr', label: 'HR', portal: 'hr', categories: ['hr'] },
  { key: 'products', label: 'Products (partner brands)', portal: 'products', categories: ['partner-brand'] },
  { key: 'ecomm-portal', label: 'E-commerce store', portal: 'ecomm-portal', categories: ['ecomm-store'] },
  { key: 'crm', label: 'CRM', portal: 'crm', categories: ['crm'] },
  { key: 'onboarding', label: 'Onboarding', portal: 'onboarding', categories: ['onboarding', 'hosts'] },
  { key: 'communications', label: 'Communications', portal: 'communications', categories: ['communications'] },
  { key: 'marketing', label: 'Marketing', portal: 'marketing', categories: ['marketing'] },
  { key: 'analytics', label: 'Analytics', portal: 'analytics', categories: ['analytics'] },
  { key: 'logs', label: 'Logs', portal: 'logs', categories: ['logs'] },
  { key: 'tech', label: 'Tech', portal: 'tech', categories: ['tech', 'logs', 'platform'] },
  // Telemetry, error boundaries and the GraphQL monitor moved here from Tech too.
  { key: 'tests', label: 'Tests', portal: 'tests', categories: ['tests', 'logs'] },
  { key: 'ai', label: 'AI', portal: 'ai', categories: ['ai'] },
  { key: 'localization', label: 'Localization', portal: 'localization', categories: ['localization'] },
  { key: 'legal', label: 'Legal', portal: 'legal', categories: ['legal'] },
  { key: 'support', label: 'Support', portal: 'support', categories: ['support', 'moderation'] },
  { key: 'website-app', label: 'Website & CMS', portal: 'website-app', categories: ['website'] },
  { key: 'challenge', label: 'Challenges', portal: 'challenge', categories: ['challenges'] },
  { key: 'gig-jobs', label: 'Gig Jobs', portal: 'gig-jobs', categories: ['gig-jobs'] },
  { key: 'ads', label: 'Ads', portal: 'ads', categories: ['ads'] },
  { key: 'mcp', label: 'MCP console', portal: MCP_PORTAL_KEY, categories: ['mcp'] },
];

const BY_KEY: ReadonlyMap<string, McpEndpoint> = new Map(MCP_ENDPOINTS.map((e) => [e.key, e]));

export const findEndpoint = (key: string): McpEndpoint | undefined => BY_KEY.get(key);

/** The endpoints this account can open — the gateway serves exactly these. */
export function accessibleEndpoints(roles: readonly string[]): McpEndpoint[] {
  return MCP_ENDPOINTS.filter((endpoint) => hasPortalAccess(endpoint.portal, roles));
}

/** Every endpoint that serves a category. */
export function endpointsForCategory(category: McpCategoryKey): string[] {
  return MCP_ENDPOINTS.filter((endpoint) => endpoint.categories.includes(category)).map((e) => e.key);
}

/** `/mcp` for the gateway, `/<key>/mcp` for every other endpoint. */
export const endpointPath = (key: string): string => (key === GATEWAY_ENDPOINT ? '/mcp' : `/${key}/mcp`);
