import { fenceUntrusted, inspectUntrusted } from '@modules/ai/askDuncit/guard/askDuncit.guard';
import { writeAudit } from '../../audit/intelAudit.service';
import { propose } from '../../approvals/intelApproval.service';
import { resolveEntry } from '../../connectors/intel.credentials';
import type { IIntelConnector } from '../../connectors/intelConnector.model';
import { effectiveClass } from '../../connectors/mcp/mcp.classify';
import { openSession } from '../../connectors/mcp/mcp.connector';
import { INTEL_LIMITS } from '../../intel.constants';
import type { TurnContext } from '../intel.context';
import { failed, str, type IntelTool, type ToolOutcome } from './intel.tool.types';

/**
 * MCP tools. Only tools discovered on a connector this turn may use can be
 * called. READ tools run at once; WRITE and DESTRUCTIVE tools become approval
 * requests — the model can never run them itself. Tool results are external
 * text: fenced, and flagged when they look like instructions.
 */

const mcpConnectors = (ctx: TurnContext) => ctx.connectors.filter((c) => c.kind === 'MCP');
const find = (ctx: TurnContext, id: unknown): IIntelConnector | null => mcpConnectors(ctx).find((c) => String(c._id) === String(id)) ?? null;

export const mcpListTool: IntelTool = {
  def: {
    type: 'function',
    function: {
      name: 'mcp_list_tools',
      description: 'List tools on the MCP connectors available here (name, class READ/WRITE/DESTRUCTIVE, description, input schema). Optionally filter by a word.',
      parameters: { type: 'object', properties: { connector_id: { type: 'string' }, query: { type: 'string' } } },
    },
  },
  available: (ctx) => mcpConnectors(ctx).length > 0,
  async run(ctx, args) {
    const q = str(args.query, 80).toLowerCase();
    const list = mcpConnectors(ctx)
      .filter((c) => !args.connector_id || String(c._id) === String(args.connector_id))
      .flatMap((c) =>
        c.tools
          .filter((t) => !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
          .slice(0, 40)
          .map((t) => ({ connector_id: String(c._id), connector: c.name, environment: c.environment, tool: t.name, class: effectiveClass(t), description: t.description.slice(0, 300), input_schema: t.input_schema.slice(0, 1500) }))
      );
    return { content: fenceUntrusted('mcp_list_tools', JSON.stringify({ tools: list.slice(0, 60) }).slice(0, INTEL_LIMITS.toolResultChars)), call: { name: 'mcp_list_tools', title: 'MCP tools', status: 'OK', summary: `${list.length} tool(s)` } };
  },
};

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
    const tool = connector?.tools.find((t) => t.name === toolName);
    if (!connector || !tool) return failed('mcp_call_tool', toolName || 'MCP', 'Unknown connector or tool. Use mcp_list_tools first.', 'DENIED');
    const cls = effectiveClass(tool);
    const toolArgs = (args.arguments && typeof args.arguments === 'object' ? args.arguments : {}) as Record<string, unknown>;
    const title = `${connector.name} · ${tool.name}`;
    if (cls !== 'READ') {
      if (!ctx.policy.can_request_writes) return failed('mcp_call_tool', title, 'Your access level cannot request changes.', 'DENIED');
      const approval = await propose(ctx.actor, { kind: 'MCP_CALL', connectorId: String(connector._id), conversationId: ctx.conversationId, messageId: ctx.messageId, action: tool.name, toolClass: cls, request: { tool: tool.name, arguments: toolArgs }, preview: { arguments: toolArgs }, impact: `${cls === 'DESTRUCTIVE' ? 'Destructive' : 'Write'} tool ${tool.name} on ${connector.name} (${connector.environment.toLowerCase()}).`, reason: str(args.reason, 500) });
      return { approvalId: String(approval._id), content: JSON.stringify({ status: 'awaiting_approval', approval_id: String(approval._id), environment: approval.environment }), call: { name: 'mcp_call_tool', title, status: 'AWAITING_APPROVAL', summary: `${cls} tool needs approval` } };
    }
    const entry = await resolveEntry('MCP_SERVER', connector.env_entry_id);
    if (!entry) return failed('mcp_call_tool', title, 'The Tech portal entry for this connector is missing.');
    try {
      const out = await (await openSession(entry)).callTool(tool.name, toolArgs);
      await writeAudit({ type: 'TOOL', action: 'mcp.call', status: out.isError ? 'FAILED' : 'OK', userId: ctx.actor.user.id, level: ctx.actor.level, environment: connector.environment, target: title, detail: JSON.stringify(toolArgs).slice(0, 1500) });
      const text = out.text.slice(0, INTEL_LIMITS.toolResultChars);
      return { content: fenceUntrusted(`mcp:${connector.name}:${tool.name}`, text, inspectUntrusted(text).length > 0), call: { name: 'mcp_call_tool', title, status: out.isError ? 'FAILED' : 'OK', summary: out.isError ? text.slice(0, 200) : 'Done' } };
    } catch (error) {
      return failed('mcp_call_tool', title, error instanceof Error ? error.message : 'The tool call failed');
    }
  },
};
