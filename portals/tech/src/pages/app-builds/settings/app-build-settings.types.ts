import { z } from 'zod';

/** Slack channel IDs look like C0123ABCD (public) or G… (private). */
const CHANNEL_ID_RE = /^[A-Z][A-Z0-9]{4,}$/;

export interface AppBuildSettingsMessages {
  channelFormat: string;
}

/** Both fields optional — an empty value clears that platform's channel. */
export const appBuildSettingsSchema = (messages: AppBuildSettingsMessages) => {
  const channel = z
    .string()
    .trim()
    .refine((v) => v === '' || CHANNEL_ID_RE.test(v), messages.channelFormat);
  return z.object({
    android_channel: channel,
    ios_channel: channel,
  });
};

export type AppBuildSettingsValues = z.infer<ReturnType<typeof appBuildSettingsSchema>>;
