import type { AiPrompt } from './types';
import type { PromptPlatformId } from './share/platforms';

/**
 * The detail view's shapes. Mirror `prompt.library.schema.ts`; the GraphQL
 * schema is what pins the two together (see the note in types.ts).
 */

export interface PromptQuality {
  /** 0-100. */
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  model: string;
  scored_at: string;
  /** The body has changed since this review. */
  stale: boolean;
}

export interface PromptShare {
  enabled: boolean;
  token: string | null;
  shared_at: string | null;
  shared_by_name: string | null;
}

export type PromptChange = 'BASELINE' | 'CREATE' | 'UPDATE' | 'SEED';

export interface PromptVersion {
  version: number;
  change: PromptChange;
  changed_fields: string[];
  name: string;
  description: string;
  content: string;
  category: string;
  target_model: string;
  is_active: boolean;
  token_count: number;
  edited_by_name: string | null;
  created_at: string | null;
}

export interface PromptDetail {
  prompt: AiPrompt;
  archived_at: string | null;
  archived_by_name: string | null;
  quality: PromptQuality | null;
  share: PromptShare;
  total_hits: number;
  last_hit_at: string | null;
  versions: PromptVersion[];
}

export interface PromptCount {
  key: string;
  count: number;
}

export interface PromptAnalytics {
  range_days: number;
  total_hits: number;
  unique_visitors: number;
  by_type: PromptCount[];
  by_platform: PromptCount[];
  by_source: PromptCount[];
  by_device: PromptCount[];
  by_day: Array<{ day: string; count: number }>;
}

/** What the portal reports as staff use a prompt. */
export type PortalPromptEvent = 'DETAIL_VIEW' | 'QUICK_VIEW' | 'COPY_PROMPT' | 'COPY_LINK' | 'OPEN_IN_PLATFORM' | 'COPY_SCRIPT';

export interface PortalEventInput {
  type: PortalPromptEvent;
  platform?: PromptPlatformId;
}
