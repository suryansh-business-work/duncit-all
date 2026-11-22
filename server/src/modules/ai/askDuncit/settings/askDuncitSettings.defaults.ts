import type { AskDuncitRoleKey } from '../askDuncit.constants';
import type { AskDuncitFeatures, AskDuncitRolePolicy, AskDuncitSuggestion } from './askDuncitSettings.types';

/**
 * The seed a fresh database starts from. Every value is edited in the AI
 * portal afterwards (Ask Duncit › Control Center / Model & LLM Settings); the
 * seed is never re-applied over an operator's change.
 */

/** The member app's MCP categories — the `app` connector's list. */
const MEMBER_CATEGORIES = ['account', 'pods', 'clubs', 'engagement', 'chat', 'support', 'legal'];

const ROLE_EXTRA_CATEGORIES: Readonly<Record<AskDuncitRoleKey, readonly string[]>> = {
  MEMBER: [],
  HOST: ['hosts'],
  VENUE_OWNER: ['venues'],
  CLUB_ADMIN: [],
  REGIONAL_CLUB_ADMIN: [],
  // Partner-brand seller tools only; the pet store (ecomm-store) is a separate product.
  ECOMM_BRAND: ['partner-brand'],
  FREELANCER: ['gig-jobs'],
  STAFF: [],
  SUPER_ADMIN: [],
};

const suggestion = (id: string, context: string | null = null): AskDuncitSuggestion => ({
  id,
  label_key: `askDuncit.suggestions.${id}`,
  label: null,
  context,
});

const COMMON_SUGGESTIONS = [
  suggestion('whatCanIDo'),
  suggestion('accountHealth'),
  suggestion('updateProfile'),
  suggestion('explainThisPod', 'POD'),
  suggestion('explainThisClub', 'CLUB'),
];

const ROLE_SUGGESTIONS: Readonly<Record<AskDuncitRoleKey, readonly AskDuncitSuggestion[]>> = {
  MEMBER: [suggestion('findPodsNearMe'), suggestion('myUpcomingPods')],
  HOST: [suggestion('myHostedPods'), suggestion('hostPerformance')],
  VENUE_OWNER: [suggestion('venueBookings'), suggestion('venueHealth')],
  CLUB_ADMIN: [suggestion('clubPods'), suggestion('clubMembers')],
  REGIONAL_CLUB_ADMIN: [suggestion('regionClubs'), suggestion('clubPods')],
  ECOMM_BRAND: [suggestion('brandOrders'), suggestion('brandProducts')],
  FREELANCER: [suggestion('gigJobs')],
  STAFF: [suggestion('pendingWork')],
  SUPER_ADMIN: [suggestion('pendingWork'), suggestion('platformHealth')],
};

const isStaff = (role: AskDuncitRoleKey) => role === 'STAFF' || role === 'SUPER_ADMIN';

export function defaultRolePolicy(role: AskDuncitRoleKey): AskDuncitRolePolicy {
  const staff = isStaff(role);
  return {
    role_key: role,
    enabled: true,
    kill_switch: false,
    model: '',
    max_output_tokens: 1200,
    allow_write: true,
    allowed_categories: staff ? ['*'] : [...MEMBER_CATEGORIES, ...ROLE_EXTRA_CATEGORIES[role]],
    allowed_tools: [],
    blocked_tools: [],
    approval_tools: [],
    approve_all_writes: true,
    messages_per_minute: staff ? 20 : 10,
    messages_per_day: staff ? 500 : 200,
    tokens_per_day: staff ? 1_000_000 : 300_000,
    instructions: '',
    suggestions: [...COMMON_SUGGESTIONS, ...ROLE_SUGGESTIONS[role]],
  };
}

export const DEFAULT_FEATURES: AskDuncitFeatures = {
  voice: true,
  uploads: true,
  memory: true,
  proactive_alerts: true,
  knowledge_base: true,
  write_actions: true,
  evaluation: true,
  rollback: true,
  handover: true,
  chat_history: true,
};

export const DEFAULT_SETTINGS = {
  enabled: true,
  kill_switch: false,
  kill_switch_reason: '',
  default_model: 'gpt-4o',
  evaluator_model: 'gpt-4o-mini',
  transcription_model: 'gpt-4o-mini-transcribe',
  speech_model: 'gpt-4o-mini-tts',
  speech_voice: 'alloy',
  temperature: 0.3,
  max_output_tokens: 1200,
  max_tool_rounds: 6,
  history_turns: 16,
  max_input_chars: 4000,
  max_attachments: 4,
  max_attachment_mb: 10,
  low_confidence_threshold: 0.5,
} as const;
