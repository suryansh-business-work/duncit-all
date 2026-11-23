import { z } from 'zod';
import { INTEL_ENV_CHOICES, INTEL_ENVIRONMENTS, INTEL_SOURCES, MEDIA_VISIBILITY } from '../intel.constants';
import type { IntelSettings, IntelSettingsSection } from './intelSettings.types';

/**
 * Server-side validation for every settings section. A save is refused with
 * field-level messages before anything is written; the console's forms run
 * their own Zod schema first, this is the gate.
 */

const modelId = z.string().trim().min(1).max(80).regex(/^[A-Za-z0-9._:-]+$/, 'Letters, digits, dot, dash, colon or underscore only');
const hostName = z.string().trim().toLowerCase().min(1).max(253).regex(/^[a-z0-9.-]+$/, 'A host name such as mcp.duncit.com');

const policy = z.object({
  environments: z.array(z.enum(INTEL_ENVIRONMENTS)).max(2),
  sources: z.array(z.enum(INTEL_SOURCES)).max(INTEL_SOURCES.length),
  can_request_writes: z.boolean(),
  messages_per_day: z.number().int().min(0).max(100_000),
});

export const SECTION_SCHEMAS: { [K in IntelSettingsSection]: z.ZodType<IntelSettings[K]> } = {
  general: z.object({
    app_title: z.string().trim().min(1).max(60),
    description: z.string().trim().max(300),
    default_environment: z.enum(INTEL_ENV_CHOICES),
    auto_sync: z.boolean(),
  }),
  models: z
    .array(z.object({ id: modelId, label: z.string().trim().min(1).max(60), enabled: z.boolean(), is_default: z.boolean() }))
    .min(1)
    .max(30)
    .refine((list) => list.filter((m) => m.is_default && m.enabled).length === 1, 'Exactly one enabled model must be the default')
    .refine((list) => new Set(list.map((m) => m.id)).size === list.length, 'Each model id can be listed once'),
  chat: z.object({
    temperature: z.number().min(0).max(2),
    max_output_tokens: z.number().int().min(200).max(16_000),
    max_tool_rounds: z.number().int().min(0).max(8),
    history_turns: z.number().int().min(2).max(50),
  }),
  openai: z.object({ env_entry_id: z.string().trim().max(40) }),
  embeddings: z
    .object({
      model: modelId,
      dimensions: z.number().int().min(64).max(4096),
      chunk_chars: z.number().int().min(300).max(6000),
      chunk_overlap: z.number().int().min(0).max(2000),
      top_k: z.number().int().min(1).max(12),
    })
    .refine((e) => e.chunk_overlap < e.chunk_chars / 2, { message: 'Overlap must be under half the chunk size', path: ['chunk_overlap'] }),
  media: z.object({
    max_file_mb: z.number().int().min(1).max(100),
    allowed_types: z.array(z.string().trim().min(3).max(100)).min(1).max(20),
    auto_index: z.boolean(),
    ocr_images: z.boolean(),
    extract_pdf: z.boolean(),
    default_visibility: z.enum(MEDIA_VISIBILITY),
    vision_model: modelId,
  }),
  sync: z.object({
    paused: z.boolean(),
    interval_minutes: z.number().int().min(5).max(24 * 60),
    max_items_per_run: z.number().int().min(50).max(20_000),
  }),
  access: z.object({ employee: policy, admin: policy }),
  security: z.object({
    four_eyes_production: z.boolean(),
    approval_expiry_hours: z.number().int().min(1).max(168),
    messages_per_minute: z.number().int().min(1).max(120),
    mcp_allowed_hosts: z.array(hostName).max(50),
    block_injection: z.boolean(),
  }),
};

/** Sections only a SUPER_ADMIN may change: they decide who can reach what. */
export const SUPER_ADMIN_SECTIONS: ReadonlySet<IntelSettingsSection> = new Set(['access', 'security']);

export const isSettingsSection = (value: string): value is IntelSettingsSection => value in SECTION_SCHEMAS;
