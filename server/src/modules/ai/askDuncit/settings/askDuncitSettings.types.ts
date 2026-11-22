import type { AskDuncitRoleKey } from '../askDuncit.constants';

/**
 * A suggestion bubble. Built-in bubbles carry a localization key (the app
 * renders the person's language and sends that text); an operator's own bubble
 * carries its text directly. `context` limits it to one kind of page.
 */
export interface AskDuncitSuggestion {
  id: string;
  label_key: string | null;
  label: string | null;
  /** POD | CLUB | VENUE | PROFILE | WALLET … ; null = everywhere. */
  context: string | null;
}

/** Everything one assistant role may do — edited in the AI Agent Control Center. */
export interface AskDuncitRolePolicy {
  role_key: AskDuncitRoleKey;
  enabled: boolean;
  /** Stops this role's conversations at once, with the reason shown in the app. */
  kill_switch: boolean;
  /** '' uses the default model. */
  model: string;
  max_output_tokens: number;
  /** False = read-only assistant for this role. */
  allow_write: boolean;
  /** MCP categories this role's assistant may use; `*` = whatever the account's consoles reach. */
  allowed_categories: string[];
  /** Extra tools by name, outside the categories. */
  allowed_tools: string[];
  blocked_tools: string[];
  /** WRITE tools that must be approved even when approve_all_writes is off. */
  approval_tools: string[];
  /** Every write waits for the person's explicit yes (destructive ones always do). */
  approve_all_writes: boolean;
  messages_per_minute: number;
  messages_per_day: number;
  tokens_per_day: number;
  /** Role-specific instructions appended to the system prompt. */
  instructions: string;
  suggestions: AskDuncitSuggestion[];
}

export interface AskDuncitFeatures {
  voice: boolean;
  uploads: boolean;
  memory: boolean;
  proactive_alerts: boolean;
  knowledge_base: boolean;
  write_actions: boolean;
  evaluation: boolean;
  rollback: boolean;
  handover: boolean;
  chat_history: boolean;
}

export interface AskDuncitSettingsValue {
  enabled: boolean;
  /** The emergency stop for every role. */
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
  /** A message whose evaluated confidence is below this is marked low-confidence. */
  low_confidence_threshold: number;
  features: AskDuncitFeatures;
  roles: AskDuncitRolePolicy[];
  updated_at: string | null;
  updated_by: string | null;
}

export type AskDuncitSettingsInput = Partial<
  Omit<AskDuncitSettingsValue, 'roles' | 'features' | 'updated_at' | 'updated_by'>
> & { features?: Partial<AskDuncitFeatures> };

export type AskDuncitRolePolicyInput = Partial<Omit<AskDuncitRolePolicy, 'role_key'>>;
