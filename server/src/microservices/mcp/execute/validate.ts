import {
  GUARD_MODES,
  MAX_ARG_DEPTH,
  MAX_ARGS_BYTES,
  MAX_STRING_LENGTH,
  META_CONFIRM,
  META_GUARD,
  META_PARAMS,
  META_REASON,
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
  type GuardMode,
} from '../mcp.constants';
import type { McpTool } from '../tools/tool.types';

/**
 * The checks every call passes before anything reaches GraphQL: the shape,
 * the size, no parameter the tool does not declare, the meta parameters, and
 * the required arguments. GraphQL then coerces every value against its real
 * type — so the AI gets a precise sentence back instead of a failed write.
 */

export type InputErrorCode = 'INVALID_ARGUMENTS' | 'CONFIRMATION_REQUIRED';

export class ToolInputError extends Error {
  constructor(
    readonly code: InputErrorCode,
    message: string
  ) {
    super(message);
  }
}

export interface ParsedCall {
  /** The tool's own arguments — meta parameters removed. */
  toolArgs: Record<string, unknown>;
  reason: string | null;
  guard: GuardMode | null;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The deepest nesting and the longest string anywhere in a value. */
function measure(value: unknown, depth = 0): { depth: number; longest: number } {
  if (typeof value === 'string') return { depth, longest: value.length };
  if (value === null || typeof value !== 'object') return { depth, longest: 0 };
  let result = { depth, longest: 0 };
  for (const item of Object.values(value)) {
    const inner = measure(item, depth + 1);
    result = { depth: Math.max(result.depth, inner.depth), longest: Math.max(result.longest, inner.longest) };
  }
  return result;
}

function readReason(raw: Record<string, unknown>, writes: boolean): string | null {
  const value = raw[META_REASON];
  if (value === undefined || value === null) {
    if (writes) {
      throw new ToolInputError('INVALID_ARGUMENTS', `${META_REASON} is required for tools that change data: say in one sentence why you are making this change.`);
    }
    return null;
  }
  const reason = typeof value === 'string' ? value.trim() : '';
  if (reason.length < REASON_MIN_LENGTH || reason.length > REASON_MAX_LENGTH) {
    throw new ToolInputError('INVALID_ARGUMENTS', `${META_REASON} must be ${REASON_MIN_LENGTH}–${REASON_MAX_LENGTH} characters of text.`);
  }
  return reason;
}

/**
 * The reason as the AI gave it, for the activity log only — trimmed and cut to
 * length, never validated — so a call refused for its arguments still says why.
 */
export function peekReason(raw: unknown): string | null {
  if (!isPlainObject(raw)) return null;
  const value = raw[META_REASON];
  if (typeof value !== 'string') return null;
  const reason = value.trim();
  return reason ? reason.slice(0, REASON_MAX_LENGTH) : null;
}

function readGuard(raw: Record<string, unknown>): GuardMode | null {
  const value = raw[META_GUARD];
  if (value === undefined || value === null) return null;
  if (!(GUARD_MODES as readonly unknown[]).includes(value)) {
    throw new ToolInputError('INVALID_ARGUMENTS', `${META_GUARD} must be one of: ${GUARD_MODES.join(', ')}.`);
  }
  return value as GuardMode;
}

export function parseCallArgs(tool: McpTool, raw: unknown): ParsedCall {
  const args = raw ?? {};
  if (!isPlainObject(args)) throw new ToolInputError('INVALID_ARGUMENTS', 'Arguments must be a JSON object.');
  if (Buffer.byteLength(JSON.stringify(args)) > MAX_ARGS_BYTES) {
    throw new ToolInputError('INVALID_ARGUMENTS', `Arguments are larger than ${MAX_ARGS_BYTES / 1024} KB.`);
  }
  const { depth, longest } = measure(args);
  if (depth > MAX_ARG_DEPTH) throw new ToolInputError('INVALID_ARGUMENTS', `Arguments are nested deeper than ${MAX_ARG_DEPTH} levels.`);
  if (longest > MAX_STRING_LENGTH) {
    throw new ToolInputError('INVALID_ARGUMENTS', `A text value is longer than ${MAX_STRING_LENGTH} characters.`);
  }

  const declared = Object.keys(tool.inputSchema.properties ?? {});
  const unknown = Object.keys(args).filter((key) => !declared.includes(key));
  if (unknown.length) {
    throw new ToolInputError(
      'INVALID_ARGUMENTS',
      `Unknown parameter${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}. ${tool.name} accepts: ${declared.join(', ')}.`
    );
  }

  const reason = readReason(args, tool.risk !== 'READ');
  const guard = readGuard(args);
  if (tool.confirm && args[META_CONFIRM] !== true) {
    throw new ToolInputError(
      'CONFIRMATION_REQUIRED',
      `${tool.title} needs the user's explicit OK. Describe exactly what will change, ask them, and call again with ${META_CONFIRM}: true only if they agree.`
    );
  }

  const missing = (tool.inputSchema.required ?? []).filter(
    (key) => !(META_PARAMS as readonly string[]).includes(key) && (args[key] === undefined || args[key] === null)
  );
  if (missing.length) throw new ToolInputError('INVALID_ARGUMENTS', `Missing required parameter${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`);

  const toolArgs = Object.fromEntries(
    Object.entries(args).filter(([key]) => !(META_PARAMS as readonly string[]).includes(key))
  );
  return { toolArgs, reason, guard };
}
