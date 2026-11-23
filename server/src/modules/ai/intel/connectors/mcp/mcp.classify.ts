import { inspectUntrusted } from '@modules/ai/askDuncit/guard/askDuncit.guard';
import type { ToolClass } from '../../intel.constants';

/**
 * How dangerous an MCP tool is. The server's own annotations decide first
 * (readOnlyHint / destructiveHint), then the tool's name. Anything unclear is
 * WRITE — never READ — so an unknown tool always goes through approval. An
 * admin override on the connector beats both.
 */

export interface McpToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
}

const READ_NAME = /^(get|list|search|find|read|describe|fetch|query|count|show|view|lookup|whoami|my_|mcp_list|mcp_search|mcp_describe)/i;
const DESTRUCTIVE_NAME = /(delete|remove|drop|destroy|purge|truncate|revoke|cancel|refund|ban|block|wipe|reset|terminate|deactivate)/i;

export function classifyTool(name: string, annotations?: McpToolAnnotations): ToolClass {
  if (annotations?.destructiveHint === true) return 'DESTRUCTIVE';
  if (DESTRUCTIVE_NAME.test(name)) return 'DESTRUCTIVE';
  if (annotations?.readOnlyHint === true) return 'READ';
  if (READ_NAME.test(name)) return 'READ';
  return 'WRITE';
}

export const effectiveClass = (tool: { class: string; override: string | null }): ToolClass =>
  (tool.override ?? tool.class) as ToolClass;

/**
 * A tool description is text written by whoever runs the server. One that
 * carries instructions ("ignore previous…", "send the token to…") is flagged
 * and its description replaced, so it never reaches the model as guidance.
 */
export function safeDescription(description: string): { text: string; flagged: boolean } {
  const flagged = inspectUntrusted(description).length > 0;
  return flagged
    ? { text: '[Description withheld: it contained instruction-like text. Inspect it in Settings › MCP Connectors.]', flagged }
    : { text: description.slice(0, 1000), flagged };
}
