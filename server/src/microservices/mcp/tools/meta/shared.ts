import { endpointPath, MCP_ENDPOINTS } from '../../catalog/endpoints';
import type { Viewer } from '../../catalog/visibility';
import { isListedOn } from '../../catalog/visibility';
import { GATEWAY_ENDPOINT } from '../../mcp.constants';
import type { McpTool, ToolContext } from '../tool.types';

/** What the meta tools share: the person, their connector URLs, and short tool rows. */

export const viewerOf = (context: ToolContext): Viewer => ({
  user: context.user,
  scopes: context.scopes,
  settings: context.settings,
});

export const connectorUrl = (publicUrl: string, endpointKey: string): string =>
  `${publicUrl.replace(/\/$/, '')}${endpointPath(endpointKey)}`;

const SUMMARY_LENGTH = 180;

/** The description without its "[Category · Risk]" tag, cut to a line. */
export function summaryOf(description: string): string {
  const text = description.replace(/^\[[^\]]*\]\s*/, '');
  return text.length > SUMMARY_LENGTH ? `${text.slice(0, SUMMARY_LENGTH - 1)}…` : text;
}

/** Every endpoint key that lists the tool (the gateway reaches the rest through mcp_call_tool). */
export const endpointsListing = (tool: McpTool): string[] =>
  [GATEWAY_ENDPOINT, ...MCP_ENDPOINTS.map((endpoint) => endpoint.key)].filter((key) => isListedOn(tool, key));

export const toolRow = (tool: McpTool) => ({
  name: tool.name,
  title: tool.title,
  category: tool.category,
  risk: tool.risk,
  needs_confirmation: tool.confirm,
  summary: summaryOf(tool.description),
});
