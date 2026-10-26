import { Schema, model, type Document, type Types } from 'mongoose';

/**
 * One MCP tool call — the row behind every number on the MCP console's
 * dashboard and every line of its Activity table: who called which tool, from
 * which AI app, why, with which arguments (credentials redacted), how it went,
 * how long it took and roughly how many tokens it put into the model's context.
 *
 * Kept for USAGE_RETENTION_DAYS, then removed by a TTL index.
 */

export type ToolCallStatus = 'OK' | 'ERROR' | 'DENIED' | 'BLOCKED' | 'INVALID';

export interface IMcpToolCall extends Document {
  user_id: Types.ObjectId;
  user_email: string | null;
  connection_id: Types.ObjectId | null;
  client_name: string;
  user_agent: string | null;
  ip: string | null;
  endpoint: string;
  tool: string;
  category: string;
  kind: string;
  risk: string;
  /** The `mcp_reason` the AI gave — why the call was made. */
  reason: string | null;
  /** The arguments as JSON, credentials redacted and long values cut. */
  args_preview: string;
  status: ToolCallStatus;
  error_code: string | null;
  error_message: string | null;
  duration_ms: number;
  input_chars: number;
  output_chars: number;
  input_tokens: number;
  output_tokens: number;
  /** Priced at the settings' rates when the call was made, so history does not move. */
  cost: number;
  currency: string;
  injection_flags: string[];
  guard_mode: string;
  created_at: Date;
}

const DAY_SECONDS = 24 * 60 * 60;
const configured = Number(process.env.MCP_USAGE_RETENTION_DAYS);
export const USAGE_RETENTION_DAYS = Number.isFinite(configured) && configured > 0 ? configured : 365;

const mcpToolCallSchema = new Schema<IMcpToolCall>(
  {
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    user_email: { type: String, default: null },
    connection_id: { type: Schema.Types.ObjectId, default: null },
    client_name: { type: String, required: true },
    user_agent: { type: String, default: null },
    ip: { type: String, default: null },
    endpoint: { type: String, required: true },
    tool: { type: String, required: true },
    category: { type: String, required: true },
    kind: { type: String, required: true },
    risk: { type: String, required: true },
    reason: { type: String, default: null },
    args_preview: { type: String, default: '{}' },
    status: { type: String, enum: ['OK', 'ERROR', 'DENIED', 'BLOCKED', 'INVALID'], required: true },
    error_code: { type: String, default: null },
    error_message: { type: String, default: null },
    duration_ms: { type: Number, required: true },
    input_chars: { type: Number, default: 0 },
    output_chars: { type: Number, default: 0 },
    input_tokens: { type: Number, default: 0 },
    output_tokens: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    injection_flags: { type: [String], default: [] },
    guard_mode: { type: String, default: 'block' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);
// The TTL index doubles as the time index — a single-field index serves both sort directions.
mcpToolCallSchema.index({ user_id: 1, created_at: -1 });
mcpToolCallSchema.index({ tool: 1, created_at: -1 });
mcpToolCallSchema.index({ created_at: 1 }, { expireAfterSeconds: USAGE_RETENTION_DAYS * DAY_SECONDS, name: 'mcp_usage_ttl' });

export const McpToolCallModel = model<IMcpToolCall>('McpToolCall', mcpToolCallSchema);
