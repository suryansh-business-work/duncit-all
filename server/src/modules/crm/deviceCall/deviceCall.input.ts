import { z } from 'zod';
import { Types } from 'mongoose';
import { GraphQLError } from 'graphql';
import { COMMS_LOG_ENTITIES } from '@modules/crm/communicationLog/communicationLog.model';
import { duplicatePhoneKey } from '@modules/crm/leadDuplicate/leadDuplicate.match';

/**
 * What the Duncit CRM app reports about a call made or taken on the phone's
 * own SIM. Validated here, at the API, so nothing the device sends (or a
 * client that is not the app) can write a malformed communication log.
 */

/** A call longer than a day is a broken call log, not a call. */
const MAX_CALL_SECONDS = 24 * 60 * 60;
/** Calls are synced on the next app open or background run; a month covers a phone left off on leave. */
const MAX_CALL_AGE_MS = 31 * 24 * 60 * 60 * 1000;
/** Device clocks drift; a call "starting" a little in the future is a clock, not a forgery. */
const CLOCK_SKEW_MS = 10 * 60 * 1000;

export const DEVICE_CALL_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export const DEVICE_CALL_OUTCOMES = ['COMPLETED', 'NO_ANSWER', 'BUSY', 'FAILED'] as const;

export const deviceCallInputSchema = z
  .object({
    // The app's own id for the call (device id + call log row id): what makes a re-sent report a no-op.
    client_call_id: z.string().trim().regex(/^[A-Za-z0-9:_-]{1,128}$/, 'client_call_id must be 1-128 letters, digits, ":", "_" or "-"'),
    entity_type: z.enum(COMMS_LOG_ENTITIES),
    entity_id: z.string().refine((id) => Types.ObjectId.isValid(id), 'entity_id is not a valid id'),
    contact_number: z.string().trim().refine((n) => duplicatePhoneKey(n) !== '', 'contact_number must have at least 7 digits'),
    contact_name: z.string().trim().max(120).nullish(),
    direction: z.enum(DEVICE_CALL_DIRECTIONS),
    outcome: z.enum(DEVICE_CALL_OUTCOMES),
    started_at: z.iso.datetime({ offset: true }),
    duration_seconds: z.number().int().min(0).max(MAX_CALL_SECONDS),
    note: z.string().trim().max(2000).nullish(),
  })
  .superRefine((input, ctx) => {
    const at = Date.parse(input.started_at);
    const now = Date.now();
    if (at > now + CLOCK_SKEW_MS) ctx.addIssue({ code: 'custom', path: ['started_at'], message: 'started_at is in the future' });
    if (at < now - MAX_CALL_AGE_MS) ctx.addIssue({ code: 'custom', path: ['started_at'], message: 'started_at is more than 31 days ago' });
  });

export type DeviceCallInput = z.infer<typeof deviceCallInputSchema>;

export const deviceCallRecordingSchema = z.object({
  log_id: z.string().refine((id) => Types.ObjectId.isValid(id), 'log_id is not a valid id'),
  recording_url: z.url({ protocol: /^https$/ }).max(2048),
  file_name: z.string().trim().max(200).nullish(),
  content_type: z.string().trim().regex(/^audio\/[a-z0-9.+-]+$/i, 'content_type must be an audio type').nullish(),
});

export type DeviceCallRecordingInput = z.infer<typeof deviceCallRecordingSchema>;

/** Parse or throw BAD_USER_INPUT naming every failing field, the same shape the forms show. */
export function parseOrThrow<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields = result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));
  throw new GraphQLError(fields.map((f) => `${f.field}: ${f.message}`).join('; '), {
    extensions: { code: 'BAD_USER_INPUT', fields },
  });
}
