import type { AuthUser } from '@context';
import { GATEWAY_ENDPOINT, SCOPE_WRITE } from '../mcp.constants';
import type { McpSettingsValue } from '../settings/settings.types';
import type { McpCatalog, McpTool } from '../tools/tool.types';
import { accessibleEndpoints, findEndpoint } from './endpoints';

/**
 * Who sees which tool, where.
 *
 * Listing is deliberately conservative and mirrors the console: a tool is shown
 * only on an endpoint the person can open, only if its category belongs to a
 * console they have, never if an MCP manager switched it (or its category)
 * off, and — if it changes anything — only on a connection they granted write
 * on while writes are enabled. The resolver behind every tool still makes its
 * own permission check on each call; this only decides what is offered.
 */

export interface Viewer {
  user: AuthUser;
  scopes: readonly string[];
  settings: McpSettingsValue;
}

export type ToolRefusal = 'DISABLED' | 'READ_ONLY_CONNECTION' | 'WRITES_DISABLED' | 'NO_PORTAL_ACCESS';

export const REFUSAL_MESSAGES: Record<ToolRefusal, string> = {
  DISABLED: 'An MCP manager has switched this tool off.',
  READ_ONLY_CONNECTION: 'This connection was approved read-only. Reconnect and allow changes to use tools that write.',
  WRITES_DISABLED: 'Tools that change data are switched off in the MCP settings right now.',
  NO_PORTAL_ACCESS: 'Your account has no console that includes this tool.',
};

/** Whether the tool appears in tools/list on this endpoint (before any per-person check). */
export function isListedOn(tool: McpTool, endpointKey: string): boolean {
  if (tool.source === 'curated') return tool.listedOn.includes('*') || tool.listedOn.includes(endpointKey);
  if (endpointKey === GATEWAY_ENDPOINT) return false;
  return Boolean(findEndpoint(endpointKey)?.categories.includes(tool.category));
}

/** Every category some console of theirs serves — computed once per listing, not per tool. */
export function reachableCategories(user: AuthUser): ReadonlySet<string> {
  return new Set(accessibleEndpoints(user.roles).flatMap((endpoint) => endpoint.categories));
}

/** Why this person may not use the tool right now, or null when they may. */
export function refusalFor(
  tool: McpTool,
  viewer: Viewer,
  reachable: ReadonlySet<string> = reachableCategories(viewer.user)
): ToolRefusal | null {
  const { settings, scopes } = viewer;
  if (settings.disabled_tools.includes(tool.name) || settings.disabled_categories.includes(tool.category)) {
    return 'DISABLED';
  }
  if (tool.risk !== 'READ') {
    if (!scopes.includes(SCOPE_WRITE)) return 'READ_ONLY_CONNECTION';
    if (!settings.write_tools_enabled) return 'WRITES_DISABLED';
  }
  return reachable.has(tool.category) ? null : 'NO_PORTAL_ACCESS';
}

/** Every tool this person may call right now, wherever it is served (what the gateway can reach). */
export function usableTools(catalog: McpCatalog, viewer: Viewer): McpTool[] {
  const reachable = reachableCategories(viewer.user);
  return catalog.tools.filter((tool) => refusalFor(tool, viewer, reachable) === null);
}

/** Whether this person can open the endpoint at all (the gateway is open to every MCP user). */
export function canOpenEndpoint(endpointKey: string, user: AuthUser): boolean {
  if (endpointKey === GATEWAY_ENDPOINT) return true;
  return accessibleEndpoints(user.roles).some((endpoint) => endpoint.key === endpointKey);
}

/** tools/list for this endpoint and person. */
export function listTools(catalog: McpCatalog, endpointKey: string, viewer: Viewer): McpTool[] {
  if (!canOpenEndpoint(endpointKey, viewer.user)) return [];
  const reachable = reachableCategories(viewer.user);
  return catalog.tools.filter((tool) => isListedOn(tool, endpointKey) && refusalFor(tool, viewer, reachable) === null);
}
