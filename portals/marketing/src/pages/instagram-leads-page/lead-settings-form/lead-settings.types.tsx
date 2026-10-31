import { z } from 'zod';
import type { Translate } from '@duncit/shell';
import type { IgLeadSettings } from '../queries';

/** The server refuses anything outside these; the form says so first. */
export const LIMITS = {
  max_follow_ups: { min: 0, max: 10 },
  follow_up_gap_days: { min: 1, max: 30 },
  daily_send_limit: { min: 1, max: 100 },
  pitch: { max: 1000 },
} as const;

export interface LeadSettingsFormValues {
  max_follow_ups: number;
  follow_up_gap_days: number;
  daily_send_limit: number;
  pitch: string;
}

export const settingsValues = (settings: IgLeadSettings): LeadSettingsFormValues => ({
  max_follow_ups: settings.max_follow_ups,
  follow_up_gap_days: settings.follow_up_gap_days,
  daily_send_limit: settings.daily_send_limit,
  pitch: settings.pitch,
});

const whole = (t: Translate, { min, max }: { min: number; max: number }) =>
  z.coerce
    .number()
    .int(t('marketing.igLeads.wholeNumber'))
    .min(min, t('marketing.igLeads.numberRange', { vars: { min, max } }))
    .max(max, t('marketing.igLeads.numberRange', { vars: { min, max } }));

export const leadSettingsSchema = (t: Translate) =>
  z.object({
    max_follow_ups: whole(t, LIMITS.max_follow_ups),
    follow_up_gap_days: whole(t, LIMITS.follow_up_gap_days),
    daily_send_limit: whole(t, LIMITS.daily_send_limit),
    pitch: z
      .string()
      .trim()
      .min(1, t('marketing.igLeads.pitchRequired'))
      .max(LIMITS.pitch.max, t('marketing.igLeads.pitchTooLong', { vars: { max: LIMITS.pitch.max } })),
  });

export interface LeadSettingsFormProps {
  settings: IgLeadSettings;
  onSubmit: (values: LeadSettingsFormValues) => Promise<void>;
}
