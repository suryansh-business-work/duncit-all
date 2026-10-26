import {
  GUARD_MODES,
  META_CONFIRM,
  META_GUARD,
  META_REASON,
  REASON_MAX_LENGTH,
  REASON_MIN_LENGTH,
} from '../mcp.constants';
import type { JsonSchema, ToolInputSchema } from './json-schema';
import type { ToolRisk } from './risk';

/**
 * Adds the three parameters every tool takes on top of its own:
 *
 *  - `mcp_reason`  why the call is being made, saved with it in the activity
 *                  log ("kyon hua"). Required for anything that writes.
 *  - `mcp_guard`   the prompt-injection guard for this one call.
 *  - `mcp_confirm` only on tools that need it: true once the person said yes.
 */
export function withMetaParams(schema: JsonSchema, risk: ToolRisk, confirm: boolean): ToolInputSchema {
  const writes = risk !== 'READ';
  const properties: Record<string, JsonSchema> = {
    ...schema.properties,
    [META_REASON]: {
      type: 'string',
      minLength: REASON_MIN_LENGTH,
      maxLength: REASON_MAX_LENGTH,
      description: `Why you are calling this tool, in one sentence. Saved in the activity log with the call.${writes ? ' Required.' : ''}`,
    },
    [META_GUARD]: {
      type: 'string',
      enum: [...GUARD_MODES],
      description:
        'Prompt-injection guard for this call. "block" refuses arguments that look like injected instructions; "warn" lets them through and flags them. Defaults to the MCP settings.',
    },
  };
  const required = [...(schema.required ?? [])];
  if (writes) required.push(META_REASON);
  if (confirm) {
    properties[META_CONFIRM] = {
      type: 'boolean',
      const: true,
      description: 'Set to true only after the user has explicitly agreed to this exact action in the conversation.',
    };
    required.push(META_CONFIRM);
  }
  const result: ToolInputSchema = { ...schema, type: 'object', properties, additionalProperties: false };
  if (required.length) result.required = required;
  return result;
}
