import { z } from 'zod';
import type { WebsiteReelSettings } from '@duncit/gql-types';

/** The bounds the server clamps every write to (websiteReelSettings.model.ts). */
export const REEL_SETTINGS_BOUNDS = {
  max_reel_mb: { min: 1, max: 100 },
  max_reels: { min: 1, max: 10 },
} as const;

type Translate = (key: string, options?: { vars: Record<string, number> }) => string;

const bounded = (t: Translate, { min, max }: { min: number; max: number }) => {
  const message = t('websiteApp.reels.settings.errRange', { vars: { min, max } });
  return z.coerce.number({ error: message }).int(message).min(min, message).max(max, message);
};

export const reelSettingsSchema = (t: Translate) =>
  z.object({
    max_reel_mb: bounded(t, REEL_SETTINGS_BOUNDS.max_reel_mb),
    max_reels: bounded(t, REEL_SETTINGS_BOUNDS.max_reels),
  });

export type ReelSettingsFormValues = z.input<ReturnType<typeof reelSettingsSchema>>;
export type ReelSettingsFormOutput = z.output<ReturnType<typeof reelSettingsSchema>>;

export const toReelSettingsValues = (settings: WebsiteReelSettings): ReelSettingsFormValues => ({
  max_reel_mb: settings.max_reel_mb,
  max_reels: settings.max_reels,
});
