import { Schema, model, type Document, type Types } from 'mongoose';
import { GUARD_MODES, type GuardMode } from '../mcp.constants';

/**
 * The one MCP settings document (`key: 'default'`). The defaults below are the
 * seed a fresh database starts from; every value is edited from the MCP
 * console's Settings page afterwards.
 */
export interface IMcpSettings extends Document {
  key: string;
  write_tools_enabled: boolean;
  default_injection_guard: GuardMode;
  disabled_tools: string[];
  disabled_categories: string[];
  token_price_input_per_million: number;
  token_price_output_per_million: number;
  currency: string;
  trusted_redirect_hosts: string[];
  allow_untrusted_clients: boolean;
  updated_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Where the AI clients Duncit staff use send people back after approving:
 * Claude (claude.ai / claude.com), ChatGPT, and loopback for the CLIs
 * (Claude Code, Gemini CLI, Codex, VS Code). Extended from the console.
 */
export const DEFAULT_TRUSTED_REDIRECT_HOSTS = [
  'claude.ai',
  'claude.com',
  'chatgpt.com',
  'chat.openai.com',
  'localhost',
  '127.0.0.1',
  '[::1]',
  'vscode.dev',
  'insiders.vscode.dev',
];

const mcpSettingsSchema = new Schema<IMcpSettings>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    write_tools_enabled: { type: Boolean, default: true },
    default_injection_guard: { type: String, enum: GUARD_MODES, default: 'block' },
    disabled_tools: { type: [String], default: [] },
    disabled_categories: { type: [String], default: [] },
    token_price_input_per_million: { type: Number, default: 0, min: 0 },
    token_price_output_per_million: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'USD' },
    trusted_redirect_hosts: { type: [String], default: () => [...DEFAULT_TRUSTED_REDIRECT_HOSTS] },
    allow_untrusted_clients: { type: Boolean, default: false },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const McpSettingsModel = model<IMcpSettings>('McpSettings', mcpSettingsSchema);
