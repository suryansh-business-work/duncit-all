import { z } from 'zod';
import type { StoreReleaseSettings } from '../../releases/queries';

/** Slack channel IDs look like C0123ABCD (public) or G… (private). */
const CHANNEL_ID_RE = /^[A-Z][A-Z\d]{4,}$/;
const EMAIL = z.email();

export const MIN_REMINDER_HOURS = 1;
export const MAX_REMINDER_HOURS = 168;

export interface ReleaseNoticesMessages {
  channelFormat: string;
  mailInvalid: string;
  mailRequired: string;
  hoursRange: string;
}

/** The addresses as typed — one per line or comma-separated — as a clean list. */
export const splitMailTo = (text: string): string[] =>
  [...new Set(text.split(/[\n,;]/).map((s) => s.trim().toLowerCase()).filter(Boolean))];

export const releaseNoticesSchema = (messages: ReleaseNoticesMessages) =>
  z.object({
    notify_enabled: z.boolean(),
    slack_channel: z
      .string()
      .trim()
      .refine((v) => v === '' || CHANNEL_ID_RE.test(v), messages.channelFormat),
    // Kept as the typed text so a half-typed address is not rewritten under
    // the cursor; split and checked here, split again on the way out.
    mail_to_text: z
      .string()
      .refine((v) => splitMailTo(v).length > 0, messages.mailRequired)
      .refine((v) => splitMailTo(v).every((email) => EMAIL.safeParse(email).success), messages.mailInvalid),
    reminders_enabled: z.boolean(),
    reminder_hours: z.number().int().min(MIN_REMINDER_HOURS, messages.hoursRange).max(MAX_REMINDER_HOURS, messages.hoursRange),
  });

export type ReleaseNoticesValues = z.infer<ReturnType<typeof releaseNoticesSchema>>;

export const toFormValues = (settings: StoreReleaseSettings): ReleaseNoticesValues => ({
  notify_enabled: settings.notify_enabled,
  slack_channel: settings.slack_channel,
  mail_to_text: settings.mail_to.join('\n'),
  reminders_enabled: settings.reminders_enabled,
  reminder_hours: settings.reminder_hours,
});

/** The mutation's input from the form's values. */
export const toSettingsInput = (values: ReleaseNoticesValues) => ({
  notify_enabled: values.notify_enabled,
  slack_channel: values.slack_channel,
  mail_to: splitMailTo(values.mail_to_text),
  reminders_enabled: values.reminders_enabled,
  reminder_hours: values.reminder_hours,
});
