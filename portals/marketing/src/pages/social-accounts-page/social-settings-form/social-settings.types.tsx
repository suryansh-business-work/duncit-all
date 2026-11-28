import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import type { SocialSettings, SocialSettingsInput } from '../settings/settings.queries';

/** The server refuses anything outside these (social.settings.ts); the form says so first. */
export const SETTINGS_LIMITS = {
  sync_every_hours: { min: 1, max: 24 },
  backfill_days: { min: 0, max: 90 },
  expiry_alert_days: { min: 1, max: 30 },
  auto_reply_daily_cap: { min: 0, max: 500 },
  keywords: { max: 20, length: 30 },
  ai_reply_guidelines: { max: 2000 },
} as const;

/** The keyword lists are typed as one comma-separated line each. */
export interface SocialSettingsFormValues {
  sync_every_hours: number;
  backfill_days: number;
  expiry_alert_days: number;
  auto_triage: boolean;
  link_dms_to_leads: boolean;
  default_assignee_user_id: string | null;
  opt_out_keywords: string;
  opt_in_keywords: string;
  auto_reply_enabled: boolean;
  auto_reply_daily_cap: number;
  auto_reply_requires_approval: boolean;
  ai_reply_guidelines: string;
  human_agent_replies: boolean;
}

/** "stop, Unsubscribe ,stop" → ["STOP", "UNSUBSCRIBE"]: trimmed, upper-cased, once each — as the server stores them. */
export const keywordList = (line: string): string[] => [
  ...new Set(
    line
      .split(',')
      .map((word) => word.trim().toUpperCase())
      .filter(Boolean)
  ),
];

export const settingsFormValues = (settings: SocialSettings): SocialSettingsFormValues => ({
  sync_every_hours: settings.sync_every_hours,
  backfill_days: settings.backfill_days,
  expiry_alert_days: settings.expiry_alert_days,
  auto_triage: settings.auto_triage,
  link_dms_to_leads: settings.link_dms_to_leads,
  default_assignee_user_id: settings.default_assignee_user_id,
  opt_out_keywords: settings.opt_out_keywords.join(', '),
  opt_in_keywords: settings.opt_in_keywords.join(', '),
  auto_reply_enabled: settings.auto_reply_enabled,
  auto_reply_daily_cap: settings.auto_reply_daily_cap,
  auto_reply_requires_approval: settings.auto_reply_requires_approval,
  ai_reply_guidelines: settings.ai_reply_guidelines,
  human_agent_replies: settings.human_agent_replies,
});

export const settingsInput = (values: SocialSettingsFormValues): SocialSettingsInput => ({
  ...values,
  ai_reply_guidelines: values.ai_reply_guidelines.trim(),
  opt_out_keywords: keywordList(values.opt_out_keywords),
  opt_in_keywords: keywordList(values.opt_in_keywords),
});

const whole = (t: Translate, { min, max }: { min: number; max: number }) =>
  z.coerce
    .number()
    .int(t('marketing.socialSettings.wholeNumber'))
    .min(min, t('marketing.socialSettings.numberRange', { vars: { min, max } }))
    .max(max, t('marketing.socialSettings.numberRange', { vars: { min, max } }));

const keywords = (t: Translate) =>
  z
    .string()
    .refine((line) => keywordList(line).length <= SETTINGS_LIMITS.keywords.max, t('marketing.socialSettings.tooManyKeywords', { vars: { max: SETTINGS_LIMITS.keywords.max } }))
    .refine(
      (line) => keywordList(line).every((word) => word.length <= SETTINGS_LIMITS.keywords.length),
      t('marketing.socialSettings.keywordTooLong', { vars: { max: SETTINGS_LIMITS.keywords.length } })
    );

export const socialSettingsSchema = (t: Translate) =>
  z
    .object({
      sync_every_hours: whole(t, SETTINGS_LIMITS.sync_every_hours),
      backfill_days: whole(t, SETTINGS_LIMITS.backfill_days),
      expiry_alert_days: whole(t, SETTINGS_LIMITS.expiry_alert_days),
      auto_triage: z.boolean(),
      link_dms_to_leads: z.boolean(),
      default_assignee_user_id: z.string().nullable(),
      opt_out_keywords: keywords(t),
      opt_in_keywords: keywords(t),
      auto_reply_enabled: z.boolean(),
      auto_reply_daily_cap: whole(t, SETTINGS_LIMITS.auto_reply_daily_cap),
      auto_reply_requires_approval: z.boolean(),
      ai_reply_guidelines: z
        .string()
        .max(SETTINGS_LIMITS.ai_reply_guidelines.max, t('marketing.socialSettings.guidelinesTooLong', { vars: { max: SETTINGS_LIMITS.ai_reply_guidelines.max } })),
      human_agent_replies: z.boolean(),
    })
    .superRefine((values, ctx) => {
      const out = new Set(keywordList(values.opt_out_keywords));
      const both = keywordList(values.opt_in_keywords).filter((word) => out.has(word));
      if (both.length > 0) {
        ctx.addIssue({ code: 'custom', path: ['opt_in_keywords'], message: t('marketing.socialSettings.keywordBothLists', { vars: { words: both.join(', ') } }) });
      }
    });

export interface SocialSettingsFormProps {
  settings: SocialSettings;
  /** Only a marketing manager may change Settings; everyone else reads them. */
  canEdit: boolean;
  /** The owner picker lists everybody with access — only some roles may read that list. */
  canPickAssignee: boolean;
  onSubmit: (input: SocialSettingsInput) => Promise<void>;
}
