import { z } from 'zod';
import { MCP_CATEGORIES } from '../../catalog/categories';
import { accessibleEndpoints, endpointsForCategory, MCP_ENDPOINTS } from '../../catalog/endpoints';
import { listTools, reachableCategories, refusalFor, type ToolRefusal } from '../../catalog/visibility';
import { defineTool } from '../define';
import type { McpCatalog } from '../tool.types';
import { connectorUrl, viewerOf } from './shared';

/**
 * mcp_audit_tools — "audit which tools exist": the whole catalog counted by
 * kind, risk, category and connector, every API field deliberately left out
 * and why, the switches an MCP manager has thrown — and, for scope "mine",
 * exactly which tools this person can use and why the rest are hidden.
 */

const EXAMPLES = 5;

function countBy<T>(items: readonly T[], keyOf: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[keyOf(item)] = (counts[keyOf(item)] ?? 0) + 1;
  return counts;
}

function catalogAudit(catalog: McpCatalog, publicUrl: string) {
  const { tools, skipped } = catalog;
  const skippedByReason = new Map<string, string[]>();
  for (const field of skipped) skippedByReason.set(field.reason, [...(skippedByReason.get(field.reason) ?? []), field.field]);
  return {
    total_tools: tools.length,
    by_kind: countBy(tools, (tool) => tool.kind),
    by_risk: countBy(tools, (tool) => tool.risk),
    needing_confirmation: tools.filter((tool) => tool.confirm).length,
    reaching_outside_duncit: tools.filter((tool) => tool.outward).length,
    categories: MCP_CATEGORIES.map((category) => {
      const inCategory = tools.filter((tool) => tool.category === category.key);
      return {
        category: category.key,
        label: category.label,
        tools: inCategory.length,
        by_risk: countBy(inCategory, (tool) => tool.risk),
        served_on: endpointsForCategory(category.key),
      };
    }),
    connectors: MCP_ENDPOINTS.map((endpoint) => ({
      key: endpoint.key,
      label: endpoint.label,
      url: connectorUrl(publicUrl, endpoint.key),
      categories: endpoint.categories,
      tools: tools.filter((tool) => tool.source === 'graphql' && endpoint.categories.includes(tool.category)).length,
    })),
    not_exposed: {
      total: skipped.length,
      by_reason: [...skippedByReason.entries()]
        .map(([reason, fields]) => ({ reason, count: fields.length, examples: fields.slice(0, EXAMPLES) }))
        .sort((a, b) => b.count - a.count),
    },
  };
}

export const auditToolsTool = defineTool({
  name: 'mcp_audit_tools',
  title: 'Audit tools',
  description:
    '[MCP · Read-only] Audits the MCP tool catalog: how many tools exist by kind, risk, category and connector; which API operations are deliberately not exposed and why; what an MCP manager has switched off; and (scope "mine", the default) exactly which tools you can use on each of your connectors and why the others are hidden.',
  category: 'mcp',
  listedOn: ['*'],
  schema: z.object({ scope: z.enum(['mine', 'catalog']).default('mine').describe('"mine" adds your own access; "catalog" is the catalog alone.') }).strict(),
  async run(context, args) {
    const settings = context.settings;
    const report: Record<string, unknown> = {
      catalog: catalogAudit(context.catalog, context.publicUrl),
      switches: {
        write_tools_enabled: settings.write_tools_enabled,
        default_injection_guard: settings.default_injection_guard,
        disabled_tools: settings.disabled_tools,
        disabled_categories: settings.disabled_categories,
      },
    };
    if (args.scope === 'mine') {
      const viewer = viewerOf(context);
      const reachable = reachableCategories(context.user);
      const hidden: Record<ToolRefusal, number> = { DISABLED: 0, READ_ONLY_CONNECTION: 0, WRITES_DISABLED: 0, NO_PORTAL_ACCESS: 0 };
      let usable = 0;
      for (const tool of context.catalog.tools) {
        const refusal = refusalFor(tool, viewer, reachable);
        if (refusal) hidden[refusal] += 1;
        else usable += 1;
      }
      report.mine = {
        usable_tools: usable,
        hidden_tools: hidden,
        connectors: accessibleEndpoints(context.user.roles).map((endpoint) => ({
          key: endpoint.key,
          url: connectorUrl(context.publicUrl, endpoint.key),
          tools: listTools(context.catalog, endpoint.key, viewer).length,
        })),
      };
    }
    return report;
  },
});
