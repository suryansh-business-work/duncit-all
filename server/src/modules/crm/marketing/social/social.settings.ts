import { GraphQLError } from 'graphql';
import { Schema, model } from 'mongoose';
import { z } from 'zod';
import { allUsersExist } from '../userNames';

/**
 * Marketing → Social → Settings: the knobs of the social module that are a
 * team's choice rather than a network's rule. One document; every save goes
 * through the change log like any other model, so who changed what is kept.
 *
 * Meta's own rules — the 24-hour window, no cold DMs — are deliberately NOT
 * here (social.window.ts): no setting can loosen them. The 7-day human agent
 * reply is Meta's too, but only for an app Meta approved for it, so it is
 * offered only once `human_agent_replies` says the app has that approval.
 */
export interface SocialSettings {
  /** Hours between two scheduled reads of an account — the fallback when a webhook was missed. */
  sync_every_hours: number;
  /** Days of DM history read when an account is connected. */
  backfill_days: number;
  /** Days before a token expires that its owner is emailed. */
  expiry_alert_days: number;
  /** Whether the AI rates every new comment and DM for sentiment and severity. */
  auto_triage: boolean;
  /** Whether an inbound DM from a lead's handle marks the lead Replied and stops its sequence. */
  link_dms_to_leads: boolean;
  /** Who a new DM conversation is assigned to; null leaves it unassigned. */
  default_assignee_user_id: string | null;
  /** A DM that is exactly one of these opts the person out of every automated message. */
  opt_out_keywords: string[];
  /** A DM that is exactly one of these opts them back in. */
  opt_in_keywords: string[];
  /** The master switch for auto-reply rules. */
  auto_reply_enabled: boolean;
  /** The most automated replies one account sends in a day. */
  auto_reply_daily_cap: number;
  /** Whether an auto-reply waits in Approvals unless its rule is marked trusted. */
  auto_reply_requires_approval: boolean;
  /** Brand-voice notes the AI follows when it drafts a reply. */
  ai_reply_guidelines: string;
  /** Whether a person may reply from 24 hours to 7 days on Meta's HUMAN_AGENT tag (the app must be approved for it). */
  human_agent_replies: boolean;
}

export const SOCIAL_SETTINGS_DEFAULTS: Readonly<SocialSettings> = {
  sync_every_hours: 3,
  backfill_days: 30,
  expiry_alert_days: 7,
  auto_triage: true,
  link_dms_to_leads: true,
  default_assignee_user_id: null,
  opt_out_keywords: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'OPT OUT'],
  opt_in_keywords: ['START', 'SUBSCRIBE'],
  auto_reply_enabled: false,
  auto_reply_daily_cap: 50,
  auto_reply_requires_approval: true,
  ai_reply_guidelines: '',
  human_agent_replies: false,
};

const MAX_KEYWORDS = 20;
const keywords = z
  .array(z.string().trim().min(1).max(30))
  .max(MAX_KEYWORDS)
  .transform((list) => [...new Set(list.map((word) => word.toUpperCase()))]);

/** What a save may hold — the Settings form carries the same bounds. */
export const socialSettingsInput = z
  .object({
    sync_every_hours: z.number().int().min(1).max(24),
    backfill_days: z.number().int().min(0).max(90),
    expiry_alert_days: z.number().int().min(1).max(30),
    auto_triage: z.boolean(),
    link_dms_to_leads: z.boolean(),
    default_assignee_user_id: z.string().trim().min(1).nullable(),
    opt_out_keywords: keywords,
    opt_in_keywords: keywords,
    auto_reply_enabled: z.boolean(),
    auto_reply_daily_cap: z.number().int().min(0).max(500),
    auto_reply_requires_approval: z.boolean(),
    ai_reply_guidelines: z.string().trim().max(2000),
    // Optional: a client from before this setting leaves the saved value as it is.
    human_agent_replies: z.boolean().nullish(),
  })
  .strict();

const settingsSchema = new Schema(
  {
    key: { type: String, default: 'default', unique: true },
    sync_every_hours: { type: Number, default: SOCIAL_SETTINGS_DEFAULTS.sync_every_hours },
    backfill_days: { type: Number, default: SOCIAL_SETTINGS_DEFAULTS.backfill_days },
    expiry_alert_days: { type: Number, default: SOCIAL_SETTINGS_DEFAULTS.expiry_alert_days },
    auto_triage: { type: Boolean, default: SOCIAL_SETTINGS_DEFAULTS.auto_triage },
    link_dms_to_leads: { type: Boolean, default: SOCIAL_SETTINGS_DEFAULTS.link_dms_to_leads },
    default_assignee_user_id: { type: String, default: null },
    opt_out_keywords: { type: [String], default: () => [...SOCIAL_SETTINGS_DEFAULTS.opt_out_keywords] },
    opt_in_keywords: { type: [String], default: () => [...SOCIAL_SETTINGS_DEFAULTS.opt_in_keywords] },
    auto_reply_enabled: { type: Boolean, default: SOCIAL_SETTINGS_DEFAULTS.auto_reply_enabled },
    auto_reply_daily_cap: { type: Number, default: SOCIAL_SETTINGS_DEFAULTS.auto_reply_daily_cap },
    auto_reply_requires_approval: { type: Boolean, default: SOCIAL_SETTINGS_DEFAULTS.auto_reply_requires_approval },
    ai_reply_guidelines: { type: String, default: SOCIAL_SETTINGS_DEFAULTS.ai_reply_guidelines },
    human_agent_replies: { type: Boolean, default: SOCIAL_SETTINGS_DEFAULTS.human_agent_replies },
    updated_by: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const SocialSettingsModel = model('SocialSettings', settingsSchema);

/**
 * Read on every webhook, so kept for a short while in this process. A save
 * here clears it at once; another server process sees the change within the
 * TTL — never long enough to matter for any of these settings.
 */
const CACHE_TTL_MS = 30_000;
let cached: { at: number; value: SocialSettings } | null = null;

const pick = (doc: Partial<SocialSettings> | null): SocialSettings => {
  const out = { ...SOCIAL_SETTINGS_DEFAULTS, opt_out_keywords: [...SOCIAL_SETTINGS_DEFAULTS.opt_out_keywords], opt_in_keywords: [...SOCIAL_SETTINGS_DEFAULTS.opt_in_keywords] };
  if (!doc) return out;
  for (const key of Object.keys(SOCIAL_SETTINGS_DEFAULTS) as (keyof SocialSettings)[]) {
    const value = doc[key];
    if (value !== undefined) Object.assign(out, { [key]: value });
  }
  return out;
};

export async function loadSocialSettings(now = Date.now()): Promise<SocialSettings> {
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;
  const doc = await SocialSettingsModel.findOne({ key: 'default' }).lean<Partial<SocialSettings>>();
  cached = { at: now, value: pick(doc) };
  return cached.value;
}

/** Forget the cached copy (a save, or a test that wrote the document directly). */
export const resetSocialSettingsCache = () => {
  cached = null;
};

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

export async function saveSocialSettings(input: unknown, userId: string): Promise<SocialSettings> {
  const parsed = socialSettingsInput.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    badInput(`${issue?.path.join('.') || 'settings'}: ${issue?.message ?? 'invalid value'}`);
  }
  const { human_agent_replies: humanAgent, ...rest } = parsed.data;
  const settings = humanAgent === undefined || humanAgent === null ? rest : { ...rest, human_agent_replies: humanAgent };
  const assignee = settings.default_assignee_user_id;
  if (assignee && !(await allUsersExist([assignee]))) badInput('default_assignee_user_id: the assignee is not a known user');
  const overlap = settings.opt_out_keywords.filter((word) => settings.opt_in_keywords.includes(word));
  if (overlap.length > 0) badInput(`opt_in_keywords: ${overlap.join(', ')} cannot both opt out and opt in`);
  await SocialSettingsModel.updateOne({ key: 'default' }, { $set: { ...settings, updated_by: userId } }, { upsert: true });
  resetSocialSettingsCache();
  return loadSocialSettings();
}

/** Whether a DM is exactly one of these keywords, ignoring case and the space around it. */
export const isKeyword = (text: string, list: readonly string[]): boolean => list.includes(text.trim().toUpperCase());
