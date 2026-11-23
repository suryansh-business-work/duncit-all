import { INTEL_SOURCES } from '../intel.constants';
import type { IntelSettings } from './intelSettings.types';

/**
 * The settings a fresh install starts from. Every value is editable in
 * Intel › Settings; these only seed the document the first time it is read.
 * Production stays read-only for everyone until an admin opts in.
 */
export const INTEL_SETTINGS_DEFAULTS: IntelSettings = {
  general: {
    app_title: 'Duncit Intel',
    description: 'Internal Business Intelligence for Duncit — chat, search, analyse and automate.',
    default_environment: 'STAGING',
    auto_sync: true,
  },
  models: [
    { id: 'gpt-4o', label: 'GPT-4o', enabled: true, is_default: true },
    { id: 'gpt-4o-mini', label: 'GPT-4o mini', enabled: true, is_default: false },
  ],
  chat: {
    temperature: 0.2,
    max_output_tokens: 1800,
    max_tool_rounds: 5,
    history_turns: 12,
  },
  openai: { env_entry_id: '' },
  embeddings: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    chunk_chars: 1200,
    chunk_overlap: 200,
    top_k: 8,
  },
  media: {
    max_file_mb: 100,
    allowed_types: ['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'text/plain', 'text/markdown', 'text/csv'],
    auto_index: true,
    ocr_images: true,
    extract_pdf: true,
    default_visibility: 'PRIVATE',
    vision_model: 'gpt-4o-mini',
  },
  sync: {
    paused: false,
    interval_minutes: 60,
    max_items_per_run: 2000,
  },
  access: {
    employee: { environments: ['STAGING'], sources: [...INTEL_SOURCES], can_request_writes: false, messages_per_day: 300 },
    admin: { environments: ['STAGING', 'PRODUCTION'], sources: [...INTEL_SOURCES], can_request_writes: true, messages_per_day: 1000 },
  },
  security: {
    four_eyes_production: true,
    approval_expiry_hours: 24,
    messages_per_minute: 12,
    mcp_allowed_hosts: ['mcp.duncit.com', 'staging.mcp.duncit.com'],
    block_injection: true,
  },
};
