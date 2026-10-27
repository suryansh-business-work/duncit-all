import { z } from 'zod';
import { CALL_TOOL_NAME, ForwardedFailure } from '../../execute/pipeline';
import { GATEWAY_ENDPOINT } from '../../mcp.constants';
import { defineTool } from '../define';

/**
 * mcp_call_tool — the gateway's way to reach any of the two thousand tools
 * without listing them all: search, describe, then call by name. The called
 * tool goes through the full pipeline with its OWN rules (access, write scope,
 * mcp_reason, mcp_confirm, the injection guard) and records its own activity
 * row; this wrapper adds nothing it could bypass.
 */
export const callToolTool = defineTool({
  name: CALL_TOOL_NAME,
  title: 'Call a tool',
  description:
    '[MCP] Runs any Duncit tool you can use, by name, with its arguments — the gateway\'s way to reach every console. Find the tool with mcp_search_tools and read its parameters with mcp_describe_tool first. The tool\'s own rules apply: put mcp_reason (and mcp_confirm when it needs the user\'s OK) inside "arguments".',
  category: 'mcp',
  listedOn: [GATEWAY_ENDPOINT],
  // It may run a tool that changes data, so clients must not treat it as read-only.
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: true },
  schema: z
    .object({
      name: z.string().trim().min(1).max(64).describe('The tool to run, e.g. "pods_create_pod".'),
      arguments: z.record(z.string(), z.unknown()).default({}).describe("That tool's arguments, exactly as mcp_describe_tool shows them."),
    })
    .strict(),
  async run(context, args) {
    const outcome = await context.callTool(args.name, args.arguments);
    if (!outcome.ok) {
      const error = outcome.error ?? { code: 'ERROR', message: `${args.name} failed.` };
      throw new ForwardedFailure(error.code, error.message);
    }
    return outcome.data;
  },
});
