import type { ToolAnnotations } from '@modelcontextprotocol/server';
import type { McpTool } from '../tools/tool.types';

/**
 * The MCP annotations an AI client shows next to a tool — and the ones Claude,
 * ChatGPT and Gemini use to decide whether to ask the person before running it.
 */
export function annotationsFor(tool: McpTool): ToolAnnotations {
  const derived: ToolAnnotations = {
    title: tool.title,
    readOnlyHint: tool.risk === 'READ',
    destructiveHint: tool.risk === 'DESTRUCTIVE',
    idempotentHint: tool.risk === 'READ',
    openWorldHint: tool.outward,
  };
  return tool.source === 'curated' && tool.annotations ? { ...derived, ...tool.annotations } : derived;
}
