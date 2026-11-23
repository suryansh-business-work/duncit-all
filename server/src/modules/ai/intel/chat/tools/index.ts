import type { ChatToolDef } from '@services/openai/openai.stream';
import type { TurnContext } from '../intel.context';
import { failed, type IntelTool, type ToolOutcome } from './intel.tool.types';
import { mcpCallTool, mcpListTool } from './mcp.tool';
import { listConnectorsTool, mongoQueryTool, mongoWriteTool } from './mongo.tool';
import { searchTool } from './search.tool';

/** Every tool the Intel assistant knows. A turn is offered only the ones its context allows. */
export const INTEL_TOOLS: readonly IntelTool[] = [searchTool, listConnectorsTool, mongoQueryTool, mongoWriteTool, mcpListTool, mcpCallTool];

export const toolDefinitions = (ctx: TurnContext): ChatToolDef[] => INTEL_TOOLS.filter((t) => t.available(ctx)).map((t) => t.def);

/** Runs a tool call from the model — after checking the tool was actually offered this turn. */
export async function dispatchTool(ctx: TurnContext, name: string, rawArgs: string): Promise<ToolOutcome> {
  const tool = INTEL_TOOLS.find((t) => t.def.function.name === name);
  if (!tool?.available(ctx)) return failed(name, name, 'That tool is not available in this conversation.', 'DENIED');
  let args: Record<string, unknown>;
  try {
    const parsed: unknown = rawArgs ? JSON.parse(rawArgs) : {};
    args = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return failed(name, name, 'The tool arguments were not valid JSON.');
  }
  return tool.run(ctx, args);
}
