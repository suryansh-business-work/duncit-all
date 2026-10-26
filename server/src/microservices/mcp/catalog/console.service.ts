import type { AuthUser } from '@context';
import { GATEWAY_ENDPOINT, SCOPE_READ, SCOPE_WRITE } from '../mcp.constants';
import type { McpSettingsValue } from '../settings/settings.types';
import { connectorUrl, endpointsListing } from '../tools/meta/shared';
import type { McpCatalog } from '../tools/tool.types';
import { categoryLabel } from './categories';
import { accessibleEndpoints, MCP_ENDPOINTS } from './endpoints';
import { listTools, reachableCategories, REFUSAL_MESSAGES, refusalFor, usableTools, type Viewer } from './visibility';

/**
 * The catalog as the MCP console shows it: the connectors with their URLs and
 * what each would offer this person, and the tools with whether they could use
 * them. Judged for a read & write connection — the console shows what is
 * possible; a read-only connection simply offers less.
 */

const consoleViewer = (user: AuthUser, settings: McpSettingsValue): Viewer => ({
  user,
  scopes: [SCOPE_READ, SCOPE_WRITE],
  settings,
});

export function connectorsFor(catalog: McpCatalog, user: AuthUser, settings: McpSettingsValue, publicUrl: string) {
  const viewer = consoleViewer(user, settings);
  const open = new Set(accessibleEndpoints(user.roles).map((endpoint) => endpoint.key));
  const gatewayCategories = [...reachableCategories(user)];
  return [
    {
      key: GATEWAY_ENDPOINT,
      label: 'Gateway — every console you have',
      url: connectorUrl(publicUrl, GATEWAY_ENDPOINT),
      portal: '',
      categories: gatewayCategories,
      accessible: true,
      tool_count: usableTools(catalog, viewer).length,
    },
    ...MCP_ENDPOINTS.map((endpoint) => ({
      key: endpoint.key,
      label: endpoint.label,
      url: connectorUrl(publicUrl, endpoint.key),
      portal: endpoint.portal,
      categories: [...endpoint.categories],
      accessible: open.has(endpoint.key),
      tool_count: open.has(endpoint.key) ? listTools(catalog, endpoint.key, viewer).length : 0,
    })),
  ];
}

export interface CatalogFilter {
  endpoint?: string | null;
  category?: string | null;
  search?: string | null;
}

export function catalogFor(catalog: McpCatalog, user: AuthUser, settings: McpSettingsValue, filter: CatalogFilter) {
  const viewer = consoleViewer(user, settings);
  const reachable = reachableCategories(user);
  const needle = filter.search?.trim().toLowerCase();
  const pool = filter.endpoint && filter.endpoint !== GATEWAY_ENDPOINT ? listTools(catalog, filter.endpoint, viewer) : catalog.tools;
  const tools = pool.filter(
    (tool) =>
      (!filter.category || tool.category === filter.category) &&
      (!needle || `${tool.name} ${tool.title} ${tool.description}`.toLowerCase().includes(needle))
  );
  const counts = new Map<string, number>();
  for (const tool of tools) counts.set(tool.category, (counts.get(tool.category) ?? 0) + 1);
  return {
    total: tools.length,
    categories: [...counts.entries()]
      .map(([category, count]) => ({ category, label: categoryLabel(category), tools: count }))
      .sort((a, b) => b.tools - a.tools),
    tools: tools.map((tool) => {
      const refusal = refusalFor(tool, viewer, reachable);
      return {
        name: tool.name,
        title: tool.title,
        description: tool.description,
        category: tool.category,
        category_label: categoryLabel(tool.category),
        kind: tool.kind,
        risk: tool.risk,
        needs_confirmation: tool.confirm,
        reaches_outside: tool.outward,
        endpoints: endpointsListing(tool),
        available: refusal === null,
        unavailable_reason: refusal ? REFUSAL_MESSAGES[refusal] : null,
        input_schema: JSON.stringify(tool.inputSchema),
      };
    }),
  };
}

/** "Pods console", or the gateway's label, for a token's resource URL. */
export function connectorLabel(resource: string, publicUrl: string): string {
  const wanted = resource.replace(/\/$/, '');
  const match = MCP_ENDPOINTS.find((endpoint) => connectorUrl(publicUrl, endpoint.key) === wanted);
  return match ? match.label : 'Gateway — every console you have';
}
