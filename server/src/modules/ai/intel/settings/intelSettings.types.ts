import type { IntelEnvChoice, IntelEnvironment, IntelSource, MediaVisibility } from '../intel.constants';

/** One chat model the console may offer. `id` is the provider's model id. */
export interface IntelModelOption {
  id: string;
  label: string;
  enabled: boolean;
  is_default: boolean;
}

/** What one access level may reach. SUPER_ADMIN is never limited by a policy. */
export interface IntelRolePolicy {
  environments: IntelEnvironment[];
  sources: IntelSource[];
  can_request_writes: boolean;
  messages_per_day: number;
}

export interface IntelSettings {
  general: {
    app_title: string;
    description: string;
    default_environment: IntelEnvChoice;
    auto_sync: boolean;
  };
  models: IntelModelOption[];
  chat: {
    temperature: number;
    max_output_tokens: number;
    max_tool_rounds: number;
    history_turns: number;
  };
  /** '' = the Tech portal's default OpenAI entry. */
  openai: { env_entry_id: string };
  embeddings: {
    model: string;
    dimensions: number;
    chunk_chars: number;
    chunk_overlap: number;
    top_k: number;
  };
  media: {
    max_file_mb: number;
    allowed_types: string[];
    auto_index: boolean;
    ocr_images: boolean;
    extract_pdf: boolean;
    default_visibility: MediaVisibility;
    vision_model: string;
  };
  sync: {
    paused: boolean;
    interval_minutes: number;
    max_items_per_run: number;
  };
  access: {
    employee: IntelRolePolicy;
    admin: IntelRolePolicy;
  };
  security: {
    four_eyes_production: boolean;
    approval_expiry_hours: number;
    messages_per_minute: number;
    mcp_allowed_hosts: string[];
    block_injection: boolean;
  };
}

export type IntelSettingsSection = keyof IntelSettings;
