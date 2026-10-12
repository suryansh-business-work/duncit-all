import { z } from 'zod';

/** Slack channel IDs look like C0123ABCD (public) or G… (private). */
const CHANNEL_ID_RE = /^[A-Z][A-Z0-9]{4,}$/;

export interface AppBuildSettingsMessages {
  channelFormat: string;
}

/**
 * Every field optional — an empty value clears that channel. An empty staging
 * channel sends that platform's staging builds to its production channel.
 */
export const appBuildSettingsSchema = (messages: AppBuildSettingsMessages) => {
  const channel = z
    .string()
    .trim()
    .refine((v) => v === '' || CHANNEL_ID_RE.test(v), messages.channelFormat);
  return z.object({
    android_channel: channel,
    ios_channel: channel,
    android_staging_channel: channel,
    ios_staging_channel: channel,
  });
};

export type AppBuildSettingsValues = z.infer<ReturnType<typeof appBuildSettingsSchema>>;

/** What the form opens with, and re-arms to after a save: the channels now stored. */
export const toAppBuildSettingsForm = (settings: {
  android_channel: string | null;
  ios_channel: string | null;
  android_staging_channel: string | null;
  ios_staging_channel: string | null;
}): AppBuildSettingsValues => ({
  android_channel: settings.android_channel ?? '',
  ios_channel: settings.ios_channel ?? '',
  android_staging_channel: settings.android_staging_channel ?? '',
  ios_staging_channel: settings.ios_staging_channel ?? '',
});
