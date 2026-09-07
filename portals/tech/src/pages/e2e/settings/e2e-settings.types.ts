import { z } from 'zod';
import { REF_RE } from '../run-tests/run-tests.types';
import type { E2eRunSettings } from '../queries';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Slack channel IDs look like C0123ABCD (public) or G… (private). */
const CHANNEL_ID_RE = /^[A-Z][A-Z\d]{4,}$/;

export interface E2eSettingsMessages {
  refFormat: string;
  timeFormat: string;
  keepLastRange: string;
  identityIncomplete: string;
  domainFormat: string;
  channelFormat: string;
}

/** A bare domain — `duncit.com`. No scheme, no path, no leading `@`. */
const DOMAIN_RE = /^[a-z\d]([a-z\d-]*[a-z\d])?(\.[a-z\d]([a-z\d-]*[a-z\d])?)+$/i;

export const e2eSettingsSchema = (messages: E2eSettingsMessages) =>
  z
    .object({
      enabled: z.boolean(),
      frequency: z.enum(['DAILY', 'WEEKLY']),
      time_of_day: z.string().trim().regex(TIME_RE, messages.timeFormat),
      weekday: z.number().int().min(0).max(6),
      ref: z.string().trim().regex(REF_RE, messages.refFormat),
      // Empty means every suite, which is what the nightly sweep should be.
      suites: z.array(z.string()),
      keep_last: z.number().int().min(1, messages.keepLastRange).max(1000, messages.keepLastRange),
      email_prefix: z.string().trim(),
      email_domain: z.string().trim(),
      // Blank leaves the saved password alone — there is no way to read one
      // back, so a field that always wrote would wipe it on every save.
      password: z.string(),
      identity_phone: z.string().trim(),
      // No validation of its own: it is a switch, and its consequences are
      // spelled out beside it rather than guarded here.
      mute_communications: z.boolean(),
      otp_bypass: z.boolean(),
      // Also a bare switch. What it costs — workspace storage — is spelled out
      // beside it, and the ceiling that bounds it is keep_last above.
      record_videos: z.boolean(),
      // Empty clears the channel, which is how a run goes back to being
      // recorded here and announced nowhere.
      slack_channel: z
        .string()
        .trim()
        .refine((v) => v === '' || CHANNEL_ID_RE.test(v), messages.channelFormat),
    })
    .superRefine((values, ctx) => {
      const hasPrefix = values.email_prefix.length > 0;
      const hasDomain = values.email_domain.length > 0;
      // Half an identity builds no address at all, and the run would silently
      // report none — so it is a validation error rather than a quiet no-op.
      if (hasPrefix !== hasDomain) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [hasPrefix ? 'email_domain' : 'email_prefix'],
          message: messages.identityIncomplete,
        });
      }
      if (hasDomain && !DOMAIN_RE.test(values.email_domain)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email_domain'],
          message: messages.domainFormat,
        });
      }
    });

export type E2eSettingsValues = z.infer<ReturnType<typeof e2eSettingsSchema>>;

/** The saved settings as form values. The password is never one of them. */
export const toFormValues = (settings: E2eRunSettings): E2eSettingsValues => ({
  enabled: settings.enabled,
  frequency: settings.frequency,
  time_of_day: settings.time_of_day,
  weekday: settings.weekday,
  ref: settings.ref,
  suites: settings.suites,
  keep_last: settings.keep_last,
  email_prefix: settings.email_prefix,
  email_domain: settings.email_domain,
  password: '',
  identity_phone: settings.identity_phone,
  mute_communications: settings.mute_communications,
  otp_bypass: settings.otp_bypass,
  record_videos: settings.record_videos,
  slack_channel: settings.slack_channel ?? '',
});

/**
 * What the mutation is sent. `password` is omitted unless one was typed, which
 * is how the server tells "leave it alone" from "clear it".
 */
export function toSettingsInput(values: E2eSettingsValues, total: number) {
  const { password, suites, ...rest } = values;
  return {
    ...rest,
    // Everything ticked means EVERY suite, which the server and the workflow
    // both spell as an empty list — so a suite added later is swept by a
    // schedule that was configured before it existed.
    suites: suites.length === total ? [] : suites,
    ...(password ? { password } : {}),
  };
}
