import { Schema, model, type Types } from 'mongoose';
import { ASK_DUNCIT_ROLE_KEYS } from '../askDuncit.constants';
import { DEFAULT_FEATURES, DEFAULT_SETTINGS } from './askDuncitSettings.defaults';
import type { AskDuncitFeatures, AskDuncitRolePolicy } from './askDuncitSettings.types';

/**
 * The one Ask Duncit settings document (`key: 'default'`). Roles missing from
 * `roles` fall back to their seeded policy on read (settings service), so a new
 * assistant role ships without a migration.
 */
export interface IAskDuncitSettings {
  _id: Types.ObjectId;
  key: string;
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
  features: AskDuncitFeatures;
  roles: AskDuncitRolePolicy[];
  updated_by: Types.ObjectId | null;
  created_at: Date;
  updated_at: Date;
}

const suggestionSchema = new Schema(
  {
    id: { type: String, required: true },
    label_key: { type: String, default: null },
    label: { type: String, default: null },
    context: { type: String, default: null },
  },
  { _id: false }
);

const rolePolicySchema = new Schema(
  {
    role_key: { type: String, enum: ASK_DUNCIT_ROLE_KEYS, required: true },
    enabled: { type: Boolean, default: true },
    kill_switch: { type: Boolean, default: false },
    model: { type: String, default: '' },
    max_output_tokens: { type: Number, default: 1200 },
    allow_write: { type: Boolean, default: true },
    allowed_categories: { type: [String], default: [] },
    allowed_tools: { type: [String], default: [] },
    blocked_tools: { type: [String], default: [] },
    approval_tools: { type: [String], default: [] },
    approve_all_writes: { type: Boolean, default: true },
    messages_per_minute: { type: Number, default: 10 },
    messages_per_day: { type: Number, default: 200 },
    tokens_per_day: { type: Number, default: 300_000 },
    instructions: { type: String, default: '' },
    suggestions: { type: [suggestionSchema], default: [] },
  },
  { _id: false }
);

const featureFields = Object.fromEntries(
  Object.entries(DEFAULT_FEATURES).map(([key, value]) => [key, { type: Boolean, default: value }])
);

const settingsSchema = new Schema<IAskDuncitSettings>(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    enabled: { type: Boolean, default: DEFAULT_SETTINGS.enabled },
    kill_switch: { type: Boolean, default: DEFAULT_SETTINGS.kill_switch },
    kill_switch_reason: { type: String, default: DEFAULT_SETTINGS.kill_switch_reason },
    default_model: { type: String, default: DEFAULT_SETTINGS.default_model },
    evaluator_model: { type: String, default: DEFAULT_SETTINGS.evaluator_model },
    transcription_model: { type: String, default: DEFAULT_SETTINGS.transcription_model },
    speech_model: { type: String, default: DEFAULT_SETTINGS.speech_model },
    speech_voice: { type: String, default: DEFAULT_SETTINGS.speech_voice },
    temperature: { type: Number, default: DEFAULT_SETTINGS.temperature },
    max_output_tokens: { type: Number, default: DEFAULT_SETTINGS.max_output_tokens },
    max_tool_rounds: { type: Number, default: DEFAULT_SETTINGS.max_tool_rounds },
    history_turns: { type: Number, default: DEFAULT_SETTINGS.history_turns },
    max_input_chars: { type: Number, default: DEFAULT_SETTINGS.max_input_chars },
    max_attachments: { type: Number, default: DEFAULT_SETTINGS.max_attachments },
    max_attachment_mb: { type: Number, default: DEFAULT_SETTINGS.max_attachment_mb },
    low_confidence_threshold: { type: Number, default: DEFAULT_SETTINGS.low_confidence_threshold },
    features: { type: new Schema(featureFields, { _id: false }), default: () => ({ ...DEFAULT_FEATURES }) },
    roles: { type: [rolePolicySchema], default: [] },
    updated_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const AskDuncitSettingsModel = model<IAskDuncitSettings>('AskDuncitSettings', settingsSchema);
