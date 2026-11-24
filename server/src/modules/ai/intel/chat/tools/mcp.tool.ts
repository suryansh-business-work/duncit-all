import { fenceUntrusted, inspectUntrusted } from '@modules/ai/askDuncit/guard/askDuncit.guard';
import { writeAudit } from '../../audit/intelAudit.service';
import { propose } from '../../approvals/intelApproval.service';
import { connectorEntry, isDuncitMcp } from '../../connectors/intel.connectorEntry';
import type { IIntelConnector } from '../../connectors/intelConnector.model';
import { callDuncitTool, duncitTools, findDuncitTool, searchDuncitTools, toolParameters } from '../../connectors/mcp/mcp.builtin';
import { effectiveClass } from '../../connectors/mcp/mcp.classify';
import { openSession } from '../../connectors/mcp/mcp.connector';
import { INTEL_LIMITS, type ToolClass } from '../../intel.constants';
import type { TurnContext } from '../intel.context';
import { failed, str, type IntelTool, type ToolOutcome } from './intel.tool.types';

/**
 * MCP tools. Only tools discovered on a connector this turn may use can be
 * called — or, for Duncit MCP (this server's own, in-process), the tools the
 * person's own access allows. READ tools run at once; WRITE and DESTRUCTIVE
 * tools become approval requests — the model can never run them itself. Tool
 * results are external text: fenced, and flagged when they look like
 * instructions.
 */

const mcpConnectors = (ctx: TurnContext) => ctx.connectors.filter((c) => c.kind === 'MCP');
const find = (ctx: TurnContext, id: unknown): IIntelConnector | null => mcpConnectors(ctx).find((c) => String(c._id) === String(id)) ?? null;

interface ToolRow {
  connector_id: string;
  connector: string;
  environment: string;
  tool: string;
  class: string;
  description: string;
  input_schema: string;
}

async function rowsOf(ctx: TurnContext, c: IIntelConnector, q: string): Promise<ToolRow[]> {
  const base = { connector_id: String(c._id), connector: c.name, environment: c.environment };
  if (isDuncitMcp(c)) {
    if (q.length < 2) return [];
    const tools = searchDuncitTools(await duncitTools(ctx.actor.user), q, 20);
    return tools.map((t) => ({ ...base, tool: t.name, class: t.risk, description: t.description.slice(0, 300), input_schema: toolParameters(t).slice(0, 1500) }));
  }
  return c.tools
    .filter((t) => !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    .slice(0, 40)
    .map((t) => ({ ...base, tool: t.name, class: effectiveClass(t), description: t.description.slice(0, 300), input_schema: t.input_schema.slice(0, 1500) }));
}

export const mcpListTool: IntelTool = {
  def: {
    type: 'function',
    function: {
      name: 'mcp_list_tools',
      description: 'List tools on the MCP connectors available here (name, class READ/WRITE/DESTRUCTIVE, description, input schema). Filter by a few words — required for Duncit MCP, which has thousands of tools.',
      parameters: { type: 'object', properties: { connector_id: { type: 'string' }, query: { type: 'string' } } },
    },
  },
  available: (ctx) => mcpConnectors(ctx).length > 0,
  async run(ctx, args) {
    const q = str(args.query, 80).toLowerCase().trim();
    const chosen = mcpConnectors(ctx).filter((c) => !args.connector_id || String(c._id) === String(args.connector_id));
    const list = (await Promise.all(chosen.map((c) => rowsOf(ctx, c, q)))).flat();
    const note = !q && chosen.some(isDuncitMcp) ? 'Duncit MCP needs a query: say in a few words what you want to do.' : undefined;
    return { content: fenceUntrusted('mcp_list_tools', JSON.stringify({ tools: list.slice(0, 60), note }).slice(0, INTEL_LIMITS.toolResultChars)), call: { name: 'mcp_list_tools', title: 'MCP tools', status: 'OK', summary: `${list.length} tool(s)` } };
  },
};

interface Resolved {
  cls: ToolClass;
  run: () => Promise<{ text: string; isError: boolean }>;
}

/** The tool's class and how to run it now (READ) — or null when this connector has no such tool. */
async function resolveTool(ctx: TurnContext, connector: IIntelConnector, toolName: string, toolArgs: Record<string, unknown>, reason: string): Promise<Resolved | 'NO_ENTRY' | null> {
  if (isDuncitMcp(connector)) {
    const tool = await findDuncitTool(ctx.actor.user, toolName);
    if (!tool) return null;
    return { cls: tool.risk, run: () => callDuncitTool({ user: ctx.actor.user, http: ctx.http, tool, args: toolArgs, reason, approved: false }) };
  }
  const tool = connector.tools.find((t) => t.name === toolName);
  if (!tool) return null;
  const entry = await connectorEntry(connector);
  if (!entry) return 'NO_ENTRY';
  return { cls: effectiveClass(tool), run: async () => (await openSession(entry)).callTool(tool.name, toolArgs) };
}

export const mcpCallTool: IntelTool = {
  def: {
    type: 'function',
    function: {
      name: 'mcp_call_tool',
      description: 'Call a tool on an MCP connector. READ tools return their result. WRITE / DESTRUCTIVE tools do not run: they create an approval request a person must approve.',
      parameters: {
        type: 'object',
        properties: { connector_id: { type: 'string' }, tool: { type: 'string' }, arguments: { type: 'object' }, reason: { type: 'string', description: 'Why, in one sentence.' } },
        required: ['connector_id', 'tool', 'reason'],
      },
    },
  },
  available: (ctx) => mcpConnectors(ctx).length > 0,
  async run(ctx, args): Promise<ToolOutcome> {
    const connector = find(ctx, args.connector_id);
    const toolName = str(args.tool, 120);
    const toolArgs = (args.arguments && typeof args.arguments === 'object' ? args.arguments : {}) as Record<string, unknown>;
    const reason = str(args.reason, 500);
    const resolved = connector ? await resolveTool(ctx, connector, toolName, toolArgs, reason) : null;
    if (!connector || !resolved) return failed('mcp_call_tool', toolName || 'MCP', 'Unknown connector or tool. Use mcp_list_tools first.', 'DENIED');
    const title = `${connector.name} · ${toolName}`;
    if (resolved === 'NO_ENTRY') return failed('mcp_call_tool', title, 'The Tech portal entry for this connector is missing.');
    if (resolved.cls !== 'READ') {
      if (!ctx.policy.can_request_writes) return failed('mcp_call_tool', title, 'Your access level cannot request changes.', 'DENIED');
      const approval = await propose(ctx.actor, { kind: 'MCP_CALL', connectorId: String(connector._id), conversationId: ctx.conversationId, messageId: ctx.messageId, action: toolName, toolClass: resolved.cls, request: { tool: toolName, arguments: toolArgs, reason }, preview: { arguments: toolArgs }, impact: `${resolved.cls === 'DESTRUCTIVE' ? 'Destructive' : 'Write'} tool ${toolName} on ${connector.name} (${connector.environment.toLowerCase()}).`, reason });
      return { approvalId: String(approval._id), content: JSON.stringify({ status: 'awaiting_approval', approval_id: String(approval._id), environment: approval.environment }), call: { name: 'mcp_call_tool', title, status: 'AWAITING_APPROVAL', summary: `${resolved.cls} tool needs approval` } };
    }
    try {
      const out = await resolved.run();
      await writeAudit({ type: 'TOOL', action: 'mcp.call', status: out.isError ? 'FAILED' : 'OK', userId: ctx.actor.user.id, level: ctx.actor.level, environment: connector.environment, target: title, detail: JSON.stringify(toolArgs).slice(0, 1500) });
      const text = out.text.slice(0, INTEL_LIMITS.toolResultChars);
      return { content: fenceUntrusted(`mcp:${connector.name}:${toolName}`, text, inspectUntrusted(text).length > 0), call: { name: 'mcp_call_tool', title, status: out.isError ? 'FAILED' : 'OK', summary: out.isError ? text.slice(0, 200) : 'Done' } };
    } catch (error) {
      return failed('mcp_call_tool', title, error instanceof Error ? error.message : 'The tool call failed');
    }
  },
};
