import type { CallToolResult } from '@modelcontextprotocol/server';
import { GraphQLError, type GraphQLFormattedError } from 'graphql';
import { logs } from '@observability/log';
import { executeAsUser, type UserCaller } from '@utils/execute-as-user';
import { isListedOn, REFUSAL_MESSAGES, refusalFor } from '../catalog/visibility';
import { hasBlockingFlag, scanForInjection, stripInvisible, type InjectionFlag } from '../guard/injection';
import { META_GUARD, type GuardMode } from '../mcp.constants';
import type { McpSettingsValue } from '../settings/settings.types';
import type { GraphQLTool, McpCatalog, McpTool, ToolCallOutcome, ToolContext } from '../tools/tool.types';
import { recordToolCall } from '../usage/usage.recorder';
import type { ToolCallStatus } from '../usage/usage.model';
import { errorResult, successResult } from './result';
import { parseCallArgs, peekReason, ToolInputError } from './validate';

/**
 * One tool call, start to finish:
 *
 *   find → may this person use it here → are the arguments right → does
 *   anything in them look like an injected instruction → run it as the person
 *   (GraphQL through Apollo, or the curated tool's own code) → strip invisible
 *   characters and flag suspicious text in the result → record the call.
 *
 * Every path ends in exactly one activity row, refusals included: a call the
 * guard blocked is precisely the one an operator needs to see.
 */

/** The gateway's call-through tool. Its own row would double-count the call it makes. */
export const CALL_TOOL_NAME = 'mcp_call_tool';

export interface CallSession {
  caller: UserCaller;
  endpoint: string;
  scopes: readonly string[];
  connection: { id: string; clientName: string };
  publicUrl: string;
  catalog: McpCatalog;
  settings: McpSettingsValue;
  meta: { ip: string | null; userAgent: string | null };
}

interface Finished {
  result: CallToolResult;
  outcome: ToolCallOutcome;
}

const DENIED_CODES = new Set(['FORBIDDEN', 'UNAUTHENTICATED']);

class CallFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: ToolCallStatus,
    /** The failure belongs to a tool mcp_call_tool ran — that call already has its row. */
    readonly forwarded = false
  ) {
    super(message);
  }
}

/** Thrown by mcp_call_tool when the tool it called failed, carrying that tool's own error. */
export class ForwardedFailure extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
  }
}

function failureFromGraphQL(errors: ReadonlyArray<GraphQLFormattedError>): CallFailure {
  const code = String(errors[0].extensions?.code ?? 'GRAPHQL_ERROR');
  const message = errors.map((error) => error.message).join('; ');
  return new CallFailure(code, message, DENIED_CODES.has(code) ? 'DENIED' : 'ERROR');
}

/** Any thrown value as the failure the AI is told about — internals stay in the log. */
function toFailure(error: unknown, tool: string): CallFailure {
  if (error instanceof CallFailure) return error;
  if (error instanceof ForwardedFailure) return new CallFailure(error.code, error.message, 'ERROR', true);
  if (error instanceof ToolInputError) return new CallFailure(error.code, error.message, 'INVALID');
  if (error instanceof GraphQLError) return failureFromGraphQL([error.toJSON()]);
  logs.server.error('mcp', 'toolCall', { error, tool });
  return new CallFailure('INTERNAL', 'The tool failed unexpectedly. The error has been logged for the Duncit team.', 'ERROR');
}

async function runGraphQL(tool: GraphQLTool, args: Record<string, unknown>, caller: UserCaller) {
  const variables = Object.fromEntries(tool.argNames.filter((name) => name in args).map((name) => [name, args[name]]));
  const { data, errors } = await executeAsUser(caller, {
    document: tool.document,
    operationName: tool.operationName,
    variables,
  });
  const value = data?.[tool.field];
  if (errors?.length && (value === null || value === undefined)) throw failureFromGraphQL(errors);
  return { data: value ?? null, warnings: (errors ?? []).map((error) => error.message) };
}

function contextFor(session: CallSession): ToolContext {
  return {
    user: session.caller.user,
    endpoint: session.endpoint,
    scopes: session.scopes,
    settings: session.settings,
    catalog: session.catalog,
    caller: session.caller,
    connection: session.connection,
    publicUrl: session.publicUrl,
    execute: (document, variables) => executeAsUser(session.caller, { document, variables }),
    callTool: async (name, args) => (await runToolCall(session, name, args, { viaGateway: true })).outcome,
  };
}

/**
 * Is it there, served here, and allowed for this person right now? The tool is
 * put on the trace as soon as it is found, so a refused call is still logged
 * under its own category, kind and risk.
 */
function resolveTool(session: CallSession, trace: Trace, viaGateway: boolean): McpTool {
  const { name } = trace;
  const tool = session.catalog.byName.get(name);
  if (!tool) {
    throw new CallFailure('UNKNOWN_TOOL', `There is no tool called ${name}. Use mcp_search_tools to find the right one.`, 'INVALID');
  }
  trace.tool = tool;
  if (viaGateway && tool.name === CALL_TOOL_NAME) {
    throw new CallFailure('INVALID_ARGUMENTS', `${CALL_TOOL_NAME} cannot call itself.`, 'INVALID');
  }
  if (!viaGateway && !isListedOn(tool, session.endpoint)) {
    throw new CallFailure('NOT_ON_THIS_ENDPOINT', `${name} is not served on this connector. Call it through the gateway (/mcp) with ${CALL_TOOL_NAME}.`, 'DENIED');
  }
  const refusal = refusalFor(tool, { user: session.caller.user, scopes: session.scopes, settings: session.settings });
  if (refusal) throw new CallFailure(refusal, REFUSAL_MESSAGES[refusal], 'DENIED');
  return tool;
}

function blockedMessage(flags: readonly InjectionFlag[]): string {
  const found = flags.filter((flag) => flag.blocking).map((flag) => `${flag.rule} at ${flag.path}`);
  return `The arguments contain text that looks like a prompt injection (${found.join(', ')}), so nothing was run. If the user really wants this exact text saved, confirm it with them and call again with ${META_GUARD}: "warn".`;
}

/** What is learned about a call as it runs — everything its activity row needs. */
interface Trace {
  name: string;
  rawArgs: unknown;
  started: number;
  tool?: McpTool;
  reason: string | null;
  guardMode: GuardMode;
  flags: InjectionFlag[];
}

interface Executed {
  data: unknown;
  warnings: string[];
  outputFlags: InjectionFlag[];
  stripped: number;
}

/** Everything up to a clean result; throws on any refusal or failure. Fills in the trace as it goes. */
async function execute(session: CallSession, trace: Trace, viaGateway: boolean): Promise<Executed> {
  // The reason the AI gave is kept even if the call is then refused for its arguments.
  trace.reason = peekReason(trace.rawArgs);
  const tool = resolveTool(session, trace, viaGateway);
  const parsed = parseCallArgs(tool, trace.rawArgs);
  trace.reason = parsed.reason;
  trace.guardMode = parsed.guard ?? trace.guardMode;
  trace.flags = scanForInjection(parsed.toolArgs);
  if (trace.guardMode === 'block' && hasBlockingFlag(trace.flags)) {
    throw new CallFailure('INJECTION_SUSPECTED', blockedMessage(trace.flags), 'BLOCKED');
  }
  const { data, warnings } =
    tool.source === 'graphql'
      ? await runGraphQL(tool, parsed.toolArgs, session.caller)
      : { data: await tool.run(contextFor(session), parsed.toolArgs), warnings: [] };
  const clean = stripInvisible(data);
  const outputFlags = scanForInjection(clean.value);
  trace.flags = [...trace.flags, ...outputFlags];
  return { data: clean.value, warnings, outputFlags, stripped: clean.stripped };
}

/** mcp_call_tool's own row is skipped only when the tool it called ran (and wrote its own). */
const recordedInside = (trace: Trace, failure: CallFailure | null): boolean =>
  trace.tool?.name === CALL_TOOL_NAME && (failure === null || failure.forwarded);

function record(session: CallSession, trace: Trace, failure: CallFailure | null, outputChars: number): Promise<void> {
  return recordToolCall({
    user: session.caller.user,
    connectionId: session.connection.id,
    clientName: session.connection.clientName,
    userAgent: session.meta.userAgent,
    ip: session.meta.ip,
    endpoint: session.endpoint,
    tool: trace.name,
    category: trace.tool?.category ?? 'unknown',
    kind: trace.tool?.kind ?? 'UNKNOWN',
    risk: trace.tool?.risk ?? 'UNKNOWN',
    reason: trace.reason,
    args: trace.rawArgs ?? {},
    status: failure?.status ?? 'OK',
    errorCode: failure?.code ?? null,
    errorMessage: failure?.message ?? null,
    durationMs: performance.now() - trace.started,
    inputChars: JSON.stringify(trace.rawArgs ?? {}).length,
    outputChars,
    injectionFlags: trace.flags.map((flag) => `${flag.rule}@${flag.path}`),
    guardMode: trace.guardMode,
    settings: session.settings,
  });
}

export async function runToolCall(
  session: CallSession,
  name: string,
  rawArgs: unknown,
  options: { viaGateway?: boolean } = {}
): Promise<Finished> {
  const trace: Trace = {
    name,
    rawArgs,
    started: performance.now(),
    reason: null,
    guardMode: session.settings.default_injection_guard,
    flags: [],
  };
  let finished: Finished;
  let failure: CallFailure | null = null;
  let text: string;
  try {
    const executed = await execute(session, trace, Boolean(options.viaGateway));
    const done = successResult({ tool: name, ...executed, flags: executed.outputFlags });
    finished = { result: done.result, outcome: { ok: true, data: executed.data } };
    text = done.text;
  } catch (error) {
    failure = toFailure(error, name);
    const done = errorResult(failure.code, failure.message);
    finished = { result: done.result, outcome: { ok: false, error: { code: failure.code, message: failure.message } } };
    text = done.text;
  }
  if (!recordedInside(trace, failure)) await record(session, trace, failure, text.length);
  return finished;
}
