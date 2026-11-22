import type { AuthUser } from '@context';
import { refusalFor, reachableCategories } from '@microservices/mcp/catalog/visibility';
import { SCOPE_READ, SCOPE_WRITE } from '@microservices/mcp/mcp.constants';
import type { McpSettingsValue } from '@microservices/mcp/settings/settings.types';
import type { McpCatalog, McpTool } from '@microservices/mcp/tools/tool.types';
import { ENGINE_EXCLUDED_CATEGORIES, ENGINE_EXCLUDED_FIELD } from '../askDuncit.constants';
import type { AskDuncitRolePolicy, AskDuncitSettingsValue } from '../settings/askDuncitSettings.types';

/**
 * What the assistant may do for this person in this role — computed on the
 * server for every turn and re-checked for every single tool call. The model
 * only ever sees (and can only ever name) tools in this set; a name outside it
 * is refused and reported as an unauthorized tool attempt.
 *
 * Layers, all of which must agree:
 *   1. never the assistant's own API, MCP meta tools or Duncit Lite;
 *   2. the MCP refusal rules — the tool's console must be one the account can
 *      open, the MCP kill switches, writes enabled;
 *   3. the role policy — categories/tools allowed, blocked tools, read-only roles;
 * and then, when it runs, the resolver's own RBAC and entity checks.
 */

export interface Capabilities {
  tools: readonly McpTool[];
  byName: ReadonlyMap<string, McpTool>;
  canWrite: boolean;
  scopes: readonly string[];
  /** Whether this tool must wait for the person's explicit yes before it runs. */
  requiresApproval(tool: McpTool): boolean;
}

export interface CapabilityInput {
  user: AuthUser;
  policy: AskDuncitRolePolicy;
  settings: AskDuncitSettingsValue;
  mcpSettings: McpSettingsValue;
  catalog: McpCatalog;
}

/** Tools no policy can open to the assistant. */
export function isEngineExcluded(tool: McpTool): boolean {
  if (tool.source === 'curated') return true;
  if (ENGINE_EXCLUDED_CATEGORIES.has(tool.category)) return true;
  return ENGINE_EXCLUDED_FIELD.test(tool.field);
}

/** The role policy alone (layer 3). */
export function policyAllows(tool: McpTool, policy: AskDuncitRolePolicy, canWrite: boolean): boolean {
  if (policy.blocked_tools.includes(tool.name)) return false;
  if (tool.risk !== 'READ' && !canWrite) return false;
  if (policy.allowed_tools.includes(tool.name)) return true;
  return policy.allowed_categories.includes('*') || policy.allowed_categories.includes(tool.category);
}

/**
 * Destructive and confirm-gated tools always wait for a yes, as do tools that
 * reach outside Duncit. Other writes wait when the role says so.
 */
export function approvalRequired(tool: McpTool, policy: AskDuncitRolePolicy): boolean {
  if (tool.risk === 'READ') return false;
  if (tool.confirm || tool.risk === 'DESTRUCTIVE' || tool.outward) return true;
  return policy.approve_all_writes || policy.approval_tools.includes(tool.name);
}

export function resolveCapabilities(input: CapabilityInput): Capabilities {
  const { user, policy, settings, mcpSettings, catalog } = input;
  const canWrite = settings.features.write_actions && policy.allow_write && mcpSettings.write_tools_enabled;
  const scopes = canWrite ? [SCOPE_READ, SCOPE_WRITE] : [SCOPE_READ];
  const viewer = { user, scopes, settings: mcpSettings };
  const reachable = reachableCategories(user);
  const tools = catalog.tools.filter(
    (tool) =>
      !isEngineExcluded(tool) && refusalFor(tool, viewer, reachable) === null && policyAllows(tool, policy, canWrite)
  );
  return {
    tools,
    byName: new Map(tools.map((tool) => [tool.name, tool])),
    canWrite,
    scopes,
    requiresApproval: (tool) => approvalRequired(tool, policy),
  };
}
