import { CURATED_TOOLS } from '../tools/curated';
import type { McpCatalog, McpTool } from '../tools/tool.types';
import { buildGraphQLTools, type CatalogSource } from './build';

/**
 * The one catalog per server process: the curated tools plus a tool for every
 * exposed API field. The schema cannot change while the process runs, so it is
 * built once — lazily, on the first MCP request or console read, not at boot.
 *
 * The source (the API's typeDefs and resolvers) is handed over by index.ts
 * rather than imported here, because the API's module list imports the MCP
 * schema — an import back the other way would be a cycle.
 */

let source: CatalogSource | null = null;
let cached: McpCatalog | null = null;

export function registerCatalogSource(next: CatalogSource): void {
  source = next;
  cached = null;
}

export function getCatalog(): McpCatalog {
  if (cached) return cached;
  if (!source) throw new Error('The MCP catalog has no source yet — registerCatalogSource runs at server start');
  const built = buildGraphQLTools(source);
  const tools: McpTool[] = [...CURATED_TOOLS, ...built.tools];
  const byName = new Map<string, McpTool>();
  for (const tool of tools) {
    if (byName.has(tool.name)) throw new Error(`Two MCP tools are both called ${tool.name}`);
    byName.set(tool.name, tool);
  }
  cached = { schema: built.schema, tools, byName, skipped: built.skipped };
  return cached;
}
