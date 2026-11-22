import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ASK_DUNCIT_ROLE_KEYS, HARD_LIMITS, type AskDuncitRoleKey } from '../askDuncit.constants';
import { recordAudit, type AuditActor } from '../audit/askDuncitAudit.service';
import { isSupportedChatModel } from '../llm/askDuncit.providers';
import { DEFAULT_FEATURES, DEFAULT_SETTINGS, defaultRolePolicy } from './askDuncitSettings.defaults';
import { AskDuncitSettingsModel, type IAskDuncitSettings } from './askDuncitSettings.model';
import type {
  AskDuncitRolePolicy,
  AskDuncitRolePolicyInput,
  AskDuncitSettingsInput,
  AskDuncitSettingsValue,
} from './askDuncitSettings.types';

/**
 * The Ask Duncit settings, read on every turn — cached for a few seconds per
 * process and dropped on every change, so a kill switch flipped in the portal
 * stops this process at once and every other within the cache window.
 */

const CACHE_MS = 10_000;

const chatModel = z
  .string()
  .trim()
  .max(80)
  .refine((m) => m === '' || isSupportedChatModel(m), 'Use an OpenAI (gpt-…, o…) or Gemini (gemini-…) chat model');

const plainModel = z.string().trim().min(1).max(80);

const settingsInput = z
  .object({
    enabled: z.boolean(),
    kill_switch: z.boolean(),
    kill_switch_reason: z.string().trim().max(300),
    default_model: chatModel.refine((m) => m !== '', 'A default model is required'),
    evaluator_model: chatModel.refine((m) => m !== '', 'An evaluator model is required'),
    transcription_model: plainModel,
    speech_model: plainModel,
    speech_voice: z.string().trim().min(1).max(40),
    temperature: z.number().min(0).max(2),
    max_output_tokens: z.number().int().min(100).max(HARD_LIMITS.maxOutputTokens),
    max_tool_rounds: z.number().int().min(0).max(HARD_LIMITS.maxToolRounds),
    history_turns: z.number().int().min(0).max(HARD_LIMITS.maxHistoryTurns),
    max_input_chars: z.number().int().min(200).max(HARD_LIMITS.maxInputChars),
    max_attachments: z.number().int().min(0).max(HARD_LIMITS.maxAttachments),
    max_attachment_mb: z.number().min(1).max(HARD_LIMITS.maxAttachmentBytes / (1024 * 1024)),
    low_confidence_threshold: z.number().min(0).max(1),
    features: z.object(Object.fromEntries(Object.keys(DEFAULT_FEATURES).map((k) => [k, z.boolean()]))).partial().strict(),
  })
  .partial()
  .strict();

const toolName = z.string().trim().regex(/^[a-z0-9_]{1,120}$/, 'Not a tool name');
const suggestionInput = z
  .object({
    id: z.string().trim().regex(/^[A-Za-z0-9_-]{1,60}$/),
    label_key: z.string().trim().max(120).nullable(),
    label: z.string().trim().max(120).nullable(),
    context: z.string().trim().max(40).nullable(),
  })
  .refine((s) => Boolean(s.label_key || s.label), 'A suggestion needs a label or a localization key');

const rolePolicyInput = z
  .object({
    enabled: z.boolean(),
    kill_switch: z.boolean(),
    model: chatModel,
    max_output_tokens: z.number().int().min(100).max(HARD_LIMITS.maxOutputTokens),
    allow_write: z.boolean(),
    allowed_categories: z.array(z.string().trim().regex(/^(\*|[a-z-]{2,40})$/)).max(60),
    allowed_tools: z.array(toolName).max(500),
    blocked_tools: z.array(toolName).max(500),
    approval_tools: z.array(toolName).max(500),
    approve_all_writes: z.boolean(),
    messages_per_minute: z.number().int().min(1).max(120),
    messages_per_day: z.number().int().min(1).max(10_000),
    tokens_per_day: z.number().int().min(1000).max(50_000_000),
    instructions: z.string().max(4000),
    suggestions: z.array(suggestionInput).max(20),
  })
  .partial()
  .strict();

let cached: { value: AskDuncitSettingsValue; at: number } | null = null;

const actorObjectId = (actor: AuditActor) => (actor.user_id && Types.ObjectId.isValid(actor.user_id) ? new Types.ObjectId(actor.user_id) : null);

const badInput = (error: z.ZodError) =>
  new GraphQLError(error.issues.map((issue) => issue.message).join('; '), { extensions: { code: 'BAD_USER_INPUT' } });

/** Stored roles plus a seeded policy for every role the document does not have yet. */
function rolesOf(doc: IAskDuncitSettings): AskDuncitRolePolicy[] {
  const stored = new Map((doc.roles ?? []).map((role) => [role.role_key, role]));
  return ASK_DUNCIT_ROLE_KEYS.map((key) => {
    const role = stored.get(key);
    if (!role) return defaultRolePolicy(key);
    return {
      ...defaultRolePolicy(key),
      ...role,
      allowed_categories: [...role.allowed_categories],
      allowed_tools: [...role.allowed_tools],
      blocked_tools: [...role.blocked_tools],
      approval_tools: [...role.approval_tools],
      suggestions: role.suggestions.map((s) => ({ id: s.id, label_key: s.label_key, label: s.label, context: s.context })),
    };
  });
}

function toValue(doc: IAskDuncitSettings): AskDuncitSettingsValue {
  const pick = <K extends keyof typeof DEFAULT_SETTINGS>(key: K) => doc[key] ?? DEFAULT_SETTINGS[key];
  return {
    enabled: pick('enabled'),
    kill_switch: pick('kill_switch'),
    kill_switch_reason: pick('kill_switch_reason'),
    default_model: pick('default_model'),
    evaluator_model: pick('evaluator_model'),
    transcription_model: pick('transcription_model'),
    speech_model: pick('speech_model'),
    speech_voice: pick('speech_voice'),
    temperature: pick('temperature'),
    max_output_tokens: pick('max_output_tokens'),
    max_tool_rounds: pick('max_tool_rounds'),
    history_turns: pick('history_turns'),
    max_input_chars: pick('max_input_chars'),
    max_attachments: pick('max_attachments'),
    max_attachment_mb: pick('max_attachment_mb'),
    low_confidence_threshold: pick('low_confidence_threshold'),
    features: { ...DEFAULT_FEATURES, ...JSON.parse(JSON.stringify(doc.features ?? {})) },
    roles: rolesOf(doc),
    updated_at: doc.updated_at ? doc.updated_at.toISOString() : null,
    updated_by: doc.updated_by ? String(doc.updated_by) : null,
  };
}

async function load(): Promise<IAskDuncitSettings> {
  return AskDuncitSettingsModel.findOneAndUpdate(
    { key: 'default' },
    { $setOnInsert: { key: 'default' } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .lean<IAskDuncitSettings>()
    .orFail();
}

function remember(doc: IAskDuncitSettings): AskDuncitSettingsValue {
  const value = toValue(doc);
  cached = { value, at: Date.now() };
  return value;
}

/** Which keys changed between two plain objects, with their before/after. */
function diff(before: object, after: object, keys: string[]) {
  const pick = (obj: object) => Object.fromEntries(keys.map((key) => [key, (obj as Record<string, unknown>)[key]]));
  return { changed: keys, before: pick(before), after: pick(after) };
}

export const askDuncitSettingsService = {
  async get(): Promise<AskDuncitSettingsValue> {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
    return remember(await load());
  },

  async policyFor(role: AskDuncitRoleKey): Promise<AskDuncitRolePolicy> {
    const settings = await this.get();
    return settings.roles.find((r) => r.role_key === role) ?? defaultRolePolicy(role);
  },

  async update(input: AskDuncitSettingsInput, actor: AuditActor): Promise<AskDuncitSettingsValue> {
    const parsed = settingsInput.safeParse(input);
    if (!parsed.success) throw badInput(parsed.error);
    const before = toValue(await load());
    const { features, ...rest } = parsed.data;
    const set: Record<string, unknown> = { ...rest, updated_by: actorObjectId(actor) };
    for (const [key, value] of Object.entries(features ?? {})) set[`features.${key}`] = value;
    const doc = await AskDuncitSettingsModel.findOneAndUpdate({ key: 'default' }, { $set: set }, { new: true })
      .lean<IAskDuncitSettings>()
      .orFail();
    const value = remember(doc);
    const keys = Object.keys(parsed.data);
    const killChanged = 'kill_switch' in parsed.data && before.kill_switch !== value.kill_switch;
    await recordAudit({
      type: killChanged ? 'KILL_SWITCH' : 'SETTINGS_CHANGED',
      actor,
      reason: killChanged ? value.kill_switch_reason : '',
      detail: { scope: 'GLOBAL', ...diff(before, value, keys) },
    });
    return value;
  },

  async updateRole(role: AskDuncitRoleKey, input: AskDuncitRolePolicyInput, actor: AuditActor) {
    const parsed = rolePolicyInput.safeParse(input);
    if (!parsed.success) throw badInput(parsed.error);
    const settings = toValue(await load());
    const before = settings.roles.find((r) => r.role_key === role) ?? defaultRolePolicy(role);
    const next: AskDuncitRolePolicy = { ...before, ...parsed.data, role_key: role };
    const roles = settings.roles.map((r) => (r.role_key === role ? next : r));
    const doc = await AskDuncitSettingsModel.findOneAndUpdate(
      { key: 'default' },
      { $set: { roles, updated_by: actorObjectId(actor) } },
      { new: true }
    )
      .lean<IAskDuncitSettings>()
      .orFail();
    const value = remember(doc);
    const killChanged = before.kill_switch !== next.kill_switch;
    await recordAudit({
      type: killChanged ? 'KILL_SWITCH' : 'SETTINGS_CHANGED',
      actor,
      detail: { scope: 'ROLE', role, ...diff(before, next, Object.keys(parsed.data)) },
    });
    return value;
  },

  /** Put one role back to its seeded policy. */
  async resetRole(role: AskDuncitRoleKey, actor: AuditActor) {
    const seed: Partial<AskDuncitRolePolicy> = { ...defaultRolePolicy(role) };
    delete seed.role_key;
    return this.updateRole(role, seed, actor);
  },

  clearCache(): void {
    cached = null;
  },
};
