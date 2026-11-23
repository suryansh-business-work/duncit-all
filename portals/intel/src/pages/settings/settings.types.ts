/**
 * The settings document as the console reads it (the server sends each section
 * as JSON; its Zod schemas are the gate, the forms here validate first).
 */

export interface ModelOption {
  id: string;
  label: string;
  enabled: boolean;
  is_default: boolean;
}

export type Env = 'STAGING' | 'PRODUCTION';
export type Source = 'MONGODB' | 'MCP' | 'GITHUB' | 'SLACK' | 'GMAIL' | 'MEDIA';
export type Visibility = 'PRIVATE' | 'TEAM' | 'ADMINS';
export type MediaType = 'application/pdf' | 'image/png' | 'image/jpeg' | 'image/webp' | 'text/plain' | 'text/markdown' | 'text/csv';

export interface RolePolicy {
  environments: Env[];
  sources: Source[];
  can_request_writes: boolean;
  messages_per_day: number;
}

export interface IntelSettingsValue {
  general: { app_title: string; description: string; default_environment: Env | 'BOTH'; auto_sync: boolean };
  models: ModelOption[];
  chat: { temperature: number; max_output_tokens: number; max_tool_rounds: number; history_turns: number };
  openai: { env_entry_id: string };
  embeddings: { model: string; dimensions: number; chunk_chars: number; chunk_overlap: number; top_k: number };
  media: { max_file_mb: number; allowed_types: MediaType[]; auto_index: boolean; ocr_images: boolean; extract_pdf: boolean; default_visibility: Visibility; vision_model: string };
  sync: { paused: boolean; interval_minutes: number; max_items_per_run: number };
  access: { employee: RolePolicy; admin: RolePolicy };
  security: { four_eyes_production: boolean; approval_expiry_hours: number; messages_per_minute: number; mcp_allowed_hosts: string[]; block_injection: boolean };
}

export type SettingsSectionKey = keyof IntelSettingsValue;

/** Parses the server's JSON; an unreadable document is an error, never silently defaulted. */
export function parseSettings(json: string): IntelSettingsValue {
  return JSON.parse(json) as IntelSettingsValue;
}
