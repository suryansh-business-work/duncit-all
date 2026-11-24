import type { Request, Response } from 'express';
import type { AuthUser } from '@context';
import { getCatalog } from '@microservices/mcp/catalog/catalog';
import { usableTools } from '@microservices/mcp/catalog/visibility';
import { runToolCall, type CallSession } from '@microservices/mcp/execute/pipeline';
import { GATEWAY_ENDPOINT, META_CONFIRM, META_GUARD, META_REASON, SCOPE_READ, SCOPE_WRITE } from '@microservices/mcp/mcp.constants';
import { mcpSettingsService } from '@microservices/mcp/settings/settings.service';
import { scoreTool } from '@microservices/mcp/tools/meta/catalog.tools';
import type { McpTool } from '@microservices/mcp/tools/tool.types';
import { stripMetaParams } from '@modules/ai/askDuncit/mcp/askDuncit.run';
import { askDuncitApollo } from '@modules/ai/askDuncit/mcp/askDuncit.session';

/**
 * Duncit MCP, in-process. This server's own MCP tools run through the same
 * pipeline an AI client connected to mcp.duncit.com uses — refusal rules,
 * argument validation, the injection guard, Apollo as the person (resolver
 * RBAC, history, audit, notifications) and one MCP activity row per call —
 * but as the signed-in Intel user, so there is no token to issue and no
 * consent screen: the console is internal and the person's own permissions
 * are the limit. Writes still go through Intel's approval queue first.
 */

/** The request a call runs under — Apollo builds the person's context from it. */
export interface IntelHttp {
  req: Request;
  res: Response;
}

export const INTEL_MCP_CLIENT = 'Duncit Intel';
const SCOPES = [SCOPE_READ, SCOPE_WRITE] as const;
const REASON_FALLBACK = 'Requested by the person in Duncit Intel';

/** The tools this person may call right now (console access, MCP manager switches, write switch). */
export async function duncitTools(user: AuthUser): Promise<McpTool[]> {
  return usableTools(getCatalog(), { user, scopes: SCOPES, settings: await mcpSettingsService.get() });
}

export async function findDuncitTool(user: AuthUser, name: string): Promise<McpTool | null> {
  return (await duncitTools(user)).find((t) => t.name === name) ?? null;
}

/** The best matches for a few words (the MCP gateway's own scoring). */
export function searchDuncitTools(tools: readonly McpTool[], query: string, limit: number): McpTool[] {
  return tools
    .map((tool) => ({ tool, score: scoreTool(tool, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .slice(0, limit)
    .map((entry) => entry.tool);
}

/** A tool's parameters without the server-owned mcp_* meta parameters. */
export function toolParameters(tool: McpTool): string {
  const properties = stripMetaParams(tool.inputSchema.properties ?? {});
  const required = (tool.inputSchema.required ?? []).filter((key) => key in properties);
  return JSON.stringify({ type: 'object', properties, required });
}

export interface DuncitCall {
  user: AuthUser;
  http: IntelHttp | undefined;
  tool: McpTool;
  args: Record<string, unknown>;
  reason: string;
  /** True only when a person approved this exact call in Intel's approval queue. */
  approved: boolean;
}

/** Run one tool as `user`. Meta parameters are the server's, never the model's. */
export async function callDuncitTool({ user, http, tool, args, reason, approved }: DuncitCall): Promise<{ text: string; isError: boolean }> {
  if (!http) return { text: 'Duncit MCP runs only inside a signed-in console request. Try again from Intel.', isError: true };
  const session: CallSession = {
    caller: { apollo: askDuncitApollo(), user, req: http.req, res: http.res, isClientGone: () => false },
    endpoint: GATEWAY_ENDPOINT,
    scopes: SCOPES,
    connection: { id: '', clientName: INTEL_MCP_CLIENT },
    publicUrl: '',
    catalog: getCatalog(),
    settings: await mcpSettingsService.get(),
    meta: { ip: http.req.ip ?? null, userAgent: http.req.get?.('user-agent') ?? null },
  };
  const callArgs: Record<string, unknown> = { ...stripMetaParams(args), [META_GUARD]: 'block' };
  if (tool.risk !== 'READ') callArgs[META_REASON] = `Duncit Intel: ${reason.trim() || REASON_FALLBACK}`.slice(0, 500);
  if (approved && tool.confirm) callArgs[META_CONFIRM] = true;
  const { outcome } = await runToolCall(session, tool.name, callArgs, { viaGateway: true });
  if (outcome.ok) return { text: JSON.stringify(outcome.data ?? null), isError: false };
  return { text: outcome.error?.message ?? 'The tool call failed', isError: true };
}
