import mongoose from 'mongoose';
import { validate } from 'graphql';
import { z } from 'zod';
import { MCP_CATEGORIES } from '../../catalog/categories';
import { endpointsForCategory } from '../../catalog/endpoints';
import { META_CONFIRM, META_GUARD, META_REASON, TOOL_NAME_PATTERN } from '../../mcp.constants';
import { defineTool } from '../define';
import type { GraphQLTool, McpCatalog, McpTool } from '../tool.types';

const isGraphQLTool = (tool: McpTool): tool is GraphQLTool => tool.source === 'graphql';

/**
 * mcp_self_test — "run the tests" on the live server: proves every tool in the
 * catalog is well-formed and every API operation it would run is valid against
 * the schema this process is serving, and that the service's dependencies
 * answer. Read-only and side-effect free; safe to run any time.
 */

const CATEGORY_KEYS = MCP_CATEGORIES.map((c) => c.key) as [string, ...string[]];
const MAX_FAILURES = 25;

export interface CheckResult {
  id: string;
  label: string;
  ok: boolean;
  checked: number;
  failures: string[];
}

function check<T extends McpTool>(id: string, label: string, items: readonly T[], failureOf: (tool: T) => string | null): CheckResult {
  const failures = items.map(failureOf).filter((failure): failure is string => failure !== null);
  return { id, label, ok: failures.length === 0, checked: items.length, failures: failures.slice(0, MAX_FAILURES) };
}

function schemaProblem(tool: McpTool): string | null {
  const { inputSchema } = tool;
  const properties = inputSchema.properties ?? {};
  const required = inputSchema.required ?? [];
  if (inputSchema.type !== 'object' || inputSchema.additionalProperties !== false) return `${tool.name}: parameters are not a closed object`;
  if (!properties[META_REASON] || !properties[META_GUARD]) return `${tool.name}: meta parameters missing`;
  if (tool.risk !== 'READ' && !required.includes(META_REASON)) return `${tool.name}: writes but does not require ${META_REASON}`;
  if (tool.confirm && !required.includes(META_CONFIRM)) return `${tool.name}: needs confirmation but does not require ${META_CONFIRM}`;
  return null;
}

export function runSelfTest(catalog: McpCatalog, tools: readonly McpTool[]): CheckResult[] {
  const names = new Set<string>();
  return [
    check('names', 'Tool names are valid and unique', tools, (tool) => {
      if (!TOOL_NAME_PATTERN.test(tool.name)) return `${tool.name}: not a valid MCP tool name`;
      if (names.has(tool.name)) return `${tool.name}: used twice`;
      names.add(tool.name);
      return null;
    }),
    check('descriptions', 'Every tool says what it does', tools, (tool) =>
      tool.description.trim().length >= 20 ? null : `${tool.name}: description too short`
    ),
    check('parameters', 'Parameters are closed JSON objects with the meta parameters', tools, schemaProblem),
    check('operations', 'Every API operation is valid against the live schema', tools.filter(isGraphQLTool), (tool) => {
      const errors = validate(catalog.schema, tool.document);
      return errors.length ? `${tool.name}: ${errors[0].message}` : null;
    }),
    check('served', 'Every category is served by at least one connector', tools, (tool) =>
      endpointsForCategory(tool.category).length || tool.source === 'curated' ? null : `${tool.name}: category ${tool.category} is on no connector`
    ),
  ];
}

export const selfTestTool = defineTool({
  name: 'mcp_self_test',
  title: 'Run MCP self-test',
  description:
    '[MCP · Read-only] Runs the MCP self-test on the live server: every tool name, description and parameter schema is well-formed, every API operation is valid against the schema being served, every category is reachable, the settings point at real tools, and the database answers. Optionally just one category. Changes nothing.',
  category: 'mcp',
  listedOn: ['*'],
  schema: z.object({ category: z.enum(CATEGORY_KEYS).optional().describe('Only test this category.') }).strict(),
  async run(context, args) {
    const tools = context.catalog.tools.filter((tool) => !args.category || tool.category === args.category);
    const results = runSelfTest(context.catalog, tools);
    const unknownDisabled = context.settings.disabled_tools.filter((name) => !context.catalog.byName.has(name));
    results.push({
      id: 'settings',
      label: 'Switched-off tools in the settings all exist',
      ok: unknownDisabled.length === 0,
      checked: context.settings.disabled_tools.length,
      failures: unknownDisabled.map((name) => `${name}: no such tool`),
    });
    const connected = mongoose.connection.readyState === mongoose.ConnectionStates.connected;
    results.push({ id: 'database', label: 'The database answers', ok: connected, checked: 1, failures: connected ? [] : ['MongoDB is not connected'] });
    const failed = results.filter((result) => !result.ok).length;
    return {
      ok: failed === 0,
      passed: results.length - failed,
      failed,
      tools_tested: tools.length,
      checks: results,
    };
  },
});
