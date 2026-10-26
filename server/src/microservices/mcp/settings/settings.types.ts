import type { GuardMode } from '../mcp.constants';

/** The MCP console's Settings page, as every part of the service reads it. */
export interface McpSettingsValue {
  /** The master switch for every tool that changes anything. */
  write_tools_enabled: boolean;
  /** The prompt-injection guard a call gets when it does not choose one. */
  default_injection_guard: GuardMode;
  /** Tools switched off by name. */
  disabled_tools: string[];
  /** Whole categories switched off. */
  disabled_categories: string[];
  /** For the usage dashboard's cost column — the AI provider's price per million tokens. */
  token_price_input_per_million: number;
  token_price_output_per_million: number;
  currency: string;
  /** OAuth redirect hosts a client may register with (Claude, ChatGPT, local CLIs…). */
  trusted_redirect_hosts: string[];
  /** Whether a client whose redirect host is not trusted may register at all. */
  allow_untrusted_clients: boolean;
  updated_at: string | null;
  updated_by: string | null;
}

export type McpSettingsInput = Partial<
  Omit<McpSettingsValue, 'updated_at' | 'updated_by'>
>;
