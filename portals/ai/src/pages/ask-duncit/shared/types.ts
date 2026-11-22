/** Ask Duncit — row and settings shapes as the portal's queries select them. */

export const ROLE_KEYS = [
  'MEMBER',
  'HOST',
  'VENUE_OWNER',
  'CLUB_ADMIN',
  'REGIONAL_CLUB_ADMIN',
  'ECOMM_BRAND',
  'FREELANCER',
  'STAFF',
  'SUPER_ADMIN',
] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

export const FEATURE_KEYS = [
  'voice',
  'uploads',
  'memory',
  'proactive_alerts',
  'knowledge_base',
  'write_actions',
  'evaluation',
  'rollback',
  'handover',
  'chat_history',
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export interface AuditRow {
  id: string;
  type: string;
  severity: string;
  status: string;
  user_id: string | null;
  user_name: string;
  role_key: string;
  account_roles: string[];
  conversation_id: string | null;
  message_id: string | null;
  action_id: string | null;
  surface: string;
  locale: string;
  page_route: string;
  entity_type: string;
  entity_id: string;
  query: string;
  response: string;
  model: string;
  total_tokens: number;
  cost_usd: number;
  tool: string;
  tool_args: string;
  violation_kind: string | null;
  reason: string;
  error_code: string;
  error_message: string;
  latency_ms: number;
  detail: string;
  intact: boolean;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  role_key: string;
  status: string;
  surface: string;
  message_count: number;
  generating: boolean;
  last_message_at: string | null;
  last_message_preview: string;
  out_of_context_count: number;
  violation_count: number;
  thumbs_up: number;
  thumbs_down: number;
  total_tokens: number;
  cost_usd: number;
  handover_team: string | null;
  handover_ticket_id: string | null;
}

export interface RolePolicy {
  role_key: RoleKey;
  enabled: boolean;
  kill_switch: boolean;
  model: string;
  max_output_tokens: number;
  allow_write: boolean;
  allowed_categories: string[];
  allowed_tools: string[];
  blocked_tools: string[];
  approval_tools: string[];
  approve_all_writes: boolean;
  messages_per_minute: number;
  messages_per_day: number;
  tokens_per_day: number;
  instructions: string;
}

export interface AskDuncitSettings {
  enabled: boolean;
  kill_switch: boolean;
  kill_switch_reason: string;
  default_model: string;
  evaluator_model: string;
  transcription_model: string;
  speech_model: string;
  speech_voice: string;
  temperature: number;
  max_output_tokens: number;
  max_tool_rounds: number;
  history_turns: number;
  max_input_chars: number;
  max_attachments: number;
  max_attachment_mb: number;
  low_confidence_threshold: number;
  features: Record<FeatureKey, boolean>;
  roles: RolePolicy[];
  updated_at: string | null;
}

export interface FeedbackRow {
  id: string;
  conversation_id: string;
  user_id: string;
  content: string;
  confidence: number | null;
  low_confidence: boolean;
  rating: string | null;
  comment: string;
  review_status: string | null;
  review_note: string;
  model: string;
  created_at: string;
}

export interface KnowledgeRow {
  id: string;
  title: string;
  kind: string;
  audience_roles: RoleKey[];
  tags: string[];
  locale: string;
  status: string;
  version: number;
  hits: number;
  updated_at: string | null;
}

export interface ToolRow {
  name: string;
  title: string;
  summary: string;
  category: string;
  category_label: string;
  risk: string;
  confirm: boolean;
  outward: boolean;
  allowed: boolean;
  blocked: boolean;
  explicitly_allowed: boolean;
  approval_required: boolean;
  calls: number;
  failures: number;
}

/** Super admins hold the Control Center levers; AI managers see them read-only. */
export const CONTROL_ROLE = 'SUPER_ADMIN';
