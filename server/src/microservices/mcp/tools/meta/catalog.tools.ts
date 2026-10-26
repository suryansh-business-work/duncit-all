import { GraphQLError, print } from 'graphql';
import { z } from 'zod';
import { annotationsFor } from '../../catalog/annotations';
import { MCP_CATEGORIES, categoryLabel } from '../../catalog/categories';
import type { JsonSchema } from '../../catalog/json-schema';
import { wordsOf } from '../../catalog/naming';
import { canOpenEndpoint, listTools, REFUSAL_MESSAGES, refusalFor, usableTools } from '../../catalog/visibility';
import { GATEWAY_ENDPOINT, META_CONFIRM, META_PARAMS, META_REASON } from '../../mcp.constants';
import { defineTool } from '../define';
import type { McpTool } from '../tool.types';
import { connectorUrl, endpointsListing, summaryOf, toolRow, viewerOf } from './shared';

/**
 * mcp_list_tools, mcp_search_tools, mcp_describe_tool — how an AI finds its way
 * around two thousand tools: list a connector's tools by category, search all
 * of them by words, then read one tool's exact parameters before calling it.
 */

const CATEGORY_KEYS = MCP_CATEGORIES.map((c) => c.key) as [string, ...string[]];
const RISKS = ['READ', 'WRITE', 'DESTRUCTIVE'] as const;

const badInput = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

export const listToolsTool = defineTool({
  name: 'mcp_list_tools',
  title: 'List tools',
  description:
    '[MCP · Read-only] Lists the tools you can use, page by page, with each one\'s category, risk and a one-line summary. Defaults to this connector; pass endpoint "gateway" for every tool across all your consoles. Filter by category, risk or a word. Use it for "list all tools".',
  category: 'mcp',
  listedOn: ['*'],
  schema: z
    .object({
      endpoint: z.string().min(1).max(64).optional().describe('Connector key (e.g. "pods", "finance") or "gateway" for everything. Default: this connector.'),
      category: z.enum(CATEGORY_KEYS).optional().describe('Only tools in this category.'),
      risk: z.enum(RISKS).optional().describe('Only READ, WRITE or DESTRUCTIVE tools.'),
      search: z.string().min(1).max(100).optional().describe('Only tools whose name, title or description contains this text.'),
      page: z.number().int().min(1).default(1),
      page_size: z.number().int().min(1).max(200).default(50),
    })
    .strict(),
  async run(context, args) {
    const viewer = viewerOf(context);
    const endpoint = args.endpoint ?? context.endpoint;
    if (!canOpenEndpoint(endpoint, context.user)) badInput(`You cannot open the "${endpoint}" connector.`);
    const pool = endpoint === GATEWAY_ENDPOINT ? usableTools(context.catalog, viewer) : listTools(context.catalog, endpoint, viewer);
    const needle = args.search?.toLowerCase();
    const matching = pool.filter(
      (tool) =>
        (!args.category || tool.category === args.category) &&
        (!args.risk || tool.risk === args.risk) &&
        (!needle || `${tool.name} ${tool.title} ${tool.description}`.toLowerCase().includes(needle))
    );
    const categories: Record<string, number> = {};
    for (const tool of matching) categories[tool.category] = (categories[tool.category] ?? 0) + 1;
    const start = (args.page - 1) * args.page_size;
    return {
      endpoint,
      total: matching.length,
      page: args.page,
      page_size: args.page_size,
      pages: Math.ceil(matching.length / args.page_size),
      categories: Object.entries(categories)
        .map(([key, count]) => ({ category: key, label: categoryLabel(key), tools: count }))
        .sort((a, b) => b.tools - a.tools),
      tools: matching.slice(start, start + args.page_size).map(toolRow),
    };
  },
});

/** How well a tool matches the words asked for — name words count most, description least. */
export function scoreTool(tool: McpTool, query: string): number {
  const words = [...new Set([...wordsOf(query), ...query.toLowerCase().split(/\s+/).filter(Boolean)])];
  if (tool.name === query.trim().toLowerCase()) return 100;
  const nameWords = tool.name.split('_');
  const title = tool.title.toLowerCase();
  const category = `${tool.category} ${categoryLabel(tool.category)}`.toLowerCase();
  const description = tool.description.toLowerCase();
  let score = 0;
  for (const word of words) {
    if (nameWords.includes(word)) score += 8;
    else if (tool.name.includes(word)) score += 4;
    if (title.includes(word)) score += 3;
    if (category.includes(word)) score += 2;
    if (description.includes(word)) score += 1;
  }
  return score;
}

export const searchToolsTool = defineTool({
  name: 'mcp_search_tools',
  title: 'Search tools',
  description:
    '[MCP · Read-only] Finds the right tool among every tool you can use, across all your consoles, by words — e.g. "create pod", "refund payment", "venue slots". Returns the best matches with a score and where each is served. Then read one with mcp_describe_tool.',
  category: 'mcp',
  listedOn: ['*'],
  schema: z
    .object({
      query: z.string().trim().min(2).max(200).describe('What you want to do, in a few words.'),
      category: z.enum(CATEGORY_KEYS).optional().describe('Only search this category.'),
      limit: z.number().int().min(1).max(50).default(10),
    })
    .strict(),
  async run(context, args) {
    const results = usableTools(context.catalog, viewerOf(context))
      .filter((tool) => !args.category || tool.category === args.category)
      .map((tool) => ({ tool, score: scoreTool(tool, args.query) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
      .slice(0, args.limit);
    return {
      query: args.query,
      results: results.map(({ tool, score }) => ({ ...toolRow(tool), score, served_on: endpointsListing(tool) })),
    };
  },
});

/** A plausible value for one schema, so a model sees the shape of a correct call. */
function exampleFor(schema: JsonSchema, name: string): unknown {
  if (schema.enum?.length) return schema.enum[0];
  switch (schema.type) {
    case 'string':
      return `<${name}>`;
    case 'integer':
    case 'number':
      return schema.minimum !== undefined && schema.minimum > 1 ? schema.minimum : 1;
    case 'boolean':
      return schema.const ?? false;
    case 'array':
      return schema.items ? [exampleFor(schema.items, name)] : [];
    case 'object':
      return exampleArguments(schema);
    default:
      return null;
  }
}

/** Every required parameter filled in, meta parameters included. */
export function exampleArguments(schema: JsonSchema): Record<string, unknown> {
  const example: Record<string, unknown> = {};
  for (const key of schema.required ?? []) {
    const property = schema.properties?.[key] ?? {};
    if (key === META_REASON) example[key] = 'One sentence on why the user wants this.';
    else if (key === META_CONFIRM) example[key] = true;
    else example[key] = exampleFor(property, key);
  }
  return example;
}

export const describeToolTool = defineTool({
  name: 'mcp_describe_tool',
  title: 'Describe a tool',
  description:
    '[MCP · Read-only] Everything about one tool before you call it: what it does, its exact parameters (JSON Schema), an example call, whether it needs a reason or the user\'s confirmation, where it is served, whether you may use it now — and for API tools, the GraphQL operation it runs.',
  category: 'mcp',
  listedOn: ['*'],
  schema: z.object({ name: z.string().trim().min(1).max(64).describe('The tool name, e.g. "pods_create_pod".') }).strict(),
  async run(context, args) {
    const tool = context.catalog.byName.get(args.name);
    if (!tool) return badInput(`There is no tool called ${args.name}. Try mcp_search_tools.`);
    const refusal = refusalFor(tool, viewerOf(context));
    return {
      name: tool.name,
      title: tool.title,
      category: { key: tool.category, label: categoryLabel(tool.category) },
      kind: tool.kind,
      risk: tool.risk,
      needs_reason: tool.risk !== 'READ',
      needs_confirmation: tool.confirm,
      reaches_outside_duncit: tool.outward,
      description: tool.description,
      summary: summaryOf(tool.description),
      available: refusal === null,
      unavailable_reason: refusal ? REFUSAL_MESSAGES[refusal] : null,
      parameters: tool.inputSchema,
      tool_parameters: Object.keys(tool.inputSchema.properties ?? {}).filter((key) => !(META_PARAMS as readonly string[]).includes(key)),
      example_arguments: exampleArguments(tool.inputSchema),
      annotations: annotationsFor(tool),
      served_on: endpointsListing(tool).map((key) => ({ endpoint: key, url: connectorUrl(context.publicUrl, key) })),
      graphql: tool.source === 'graphql' ? print(tool.document) : null,
    };
  },
});
