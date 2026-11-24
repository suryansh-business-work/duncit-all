import { getCatalog } from '@microservices/mcp/catalog/catalog';
import { intelSettingsService } from '../../settings/intelSettings.service';
import { DUNCIT_MCP_ENTRY } from '../intel.builtin';
import type { ResolvedEntry } from '../intel.credentials';
import type { ConnectorDriver, SyncContext, TestResult } from '../intel.driver';
import { IntelConnectorModel, type IIntelConnector } from '../intelConnector.model';
import { classifyTool, safeDescription } from './mcp.classify';
import { McpSession } from './mcp.client';

/**
 * MCP connectors. A sync is tool discovery: the server's tool list, each tool
 * classified READ / WRITE / DESTRUCTIVE (admin overrides kept across syncs),
 * with injected-looking descriptions withheld. Calls happen at chat time
 * (intel.tools), never during a sync.
 *
 * Duncit MCP (this server's own, in-process) has no list to discover: its
 * tools are offered per person, live, by what each person may use.
 */

const isDuncit = (entry: ResolvedEntry) => entry.id === DUNCIT_MCP_ENTRY;

export async function openSession(entry: ResolvedEntry): Promise<McpSession> {
  const settings = await intelSettingsService.get();
  const session = new McpSession({
    url: entry.config.url ?? '',
    token: entry.config.auth_token ?? '',
    headerName: entry.config.header_name,
    allowedHosts: settings.security.mcp_allowed_hosts,
  });
  await session.initialize();
  return session;
}

export async function discoverTools(connector: IIntelConnector, entry: ResolvedEntry) {
  if (isDuncit(entry)) return [];
  const session = await openSession(entry);
  const tools = await session.listTools();
  const overrides = new Map(connector.tools.map((t) => [t.name, t.override]));
  const stored = tools.map((t) => {
    const desc = safeDescription(t.description ?? '');
    return {
      name: t.name.slice(0, 120),
      description: desc.text,
      class: classifyTool(t.name, t.annotations),
      override: overrides.get(t.name) ?? null,
      input_schema: JSON.stringify(t.inputSchema ?? {}).slice(0, 20_000),
    };
  });
  await IntelConnectorModel.updateOne({ _id: connector._id }, { $set: { tools: stored } });
  return stored;
}

export const mcpDriver: ConnectorDriver = {
  async test(_connector, entry): Promise<TestResult> {
    if (isDuncit(entry)) return { ok: true, message: `Connected in-process. Duncit MCP has ${getCatalog().tools.length} tool(s); each person can use the ones their own access allows.`, details: [] };
    try {
      const session = await openSession(entry);
      const tools = await session.listTools(50);
      return { ok: true, message: `Connected. The server offers ${tools.length}${tools.length === 50 ? '+' : ''} tool(s).`, details: tools.slice(0, 10).map((t) => t.name) };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : 'Connection failed', details: [] };
    }
  },

  async sync(ctx: SyncContext) {
    if (isDuncit(ctx.entry)) {
      ctx.log(`Duncit MCP runs in-process: ${getCatalog().tools.length} tool(s), offered per person.`);
      return;
    }
    const tools = await discoverTools(ctx.connector, ctx.entry);
    const counts = tools.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.override ?? t.class]: (acc[t.override ?? t.class] ?? 0) + 1 }), {});
    ctx.log(`Discovered ${tools.length} tool(s): ${Object.entries(counts).map(([k, v]) => `${v} ${k.toLowerCase()}`).join(', ')}`);
  },
};
