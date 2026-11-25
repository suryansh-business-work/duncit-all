import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import type { AuthUser } from '@context';
import { hasRole } from '@middleware/rbac';
import { isTrustedMediaUrl } from '@utils/url';
import { servamService } from '@services/servam/servam.service';
import { LEAD_MODELS } from '@modules/crm/crm/leadModels';
import { CommunicationLogModel } from '@modules/crm/communicationLog/communicationLog.model';
import { communicationLogService } from '@modules/crm/communicationLog/communicationLog.service';
import { summarizeCallInBackground } from '@modules/crm/call/call.summary';
import {
  deviceCallInputSchema,
  deviceCallRecordingSchema,
  parseOrThrow,
  type DeviceCallInput,
} from './deviceCall.input';

/**
 * Calls made or taken on an employee's own phone, reported by the Duncit CRM
 * app. They land in the same CommunicationLog the portal's Twilio calls use, so
 * the lead's Communications tab, its AI summary and its search show both.
 *
 * A device call is told apart by `metadata.mode = 'DEVICE'` and addressed by
 * `external_id = device:<client_call_id>`, unique per caller (the
 * `device_call_once` index): the app re-sends whatever it is unsure the server
 * took, and a re-send must return the row it already made.
 */

const MODE = 'DEVICE';
const STATUS_OF: Record<DeviceCallInput['outcome'], string> = {
  COMPLETED: 'COMPLETED',
  NO_ANSWER: 'NO_ANSWER',
  BUSY: 'BUSY',
  FAILED: 'FAILED',
};

const notFound = (what: string) => new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });
const forbidden = (msg: string) => new GraphQLError(msg, { extensions: { code: 'FORBIDDEN' } });
const badInput = (msg: string) => new GraphQLError(msg, { extensions: { code: 'BAD_USER_INPUT' } });

const externalId = (clientCallId: string) => `device:${clientCallId}`;

/** "2m 14s" — how long a call ran, in the lead's timeline. */
export function durationLabel(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${minutes}m ${rest}s` : `${minutes}m`;
}

/** The lead timeline line: "Inbound call (2m 14s)", "Outbound call — no answer". */
export function timelineSummary(input: Pick<DeviceCallInput, 'direction' | 'outcome' | 'duration_seconds'>): string {
  const kind = input.direction === 'INBOUND' ? 'Inbound call' : 'Outbound call';
  if (input.outcome === 'COMPLETED') return `${kind} (${durationLabel(input.duration_seconds)})`;
  return `${kind} — ${input.outcome.toLowerCase().replace('_', ' ')}`;
}

const isDuplicateKey = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

async function existingLog(userId: string, clientCallId: string) {
  const doc = await CommunicationLogModel.findOne({
    created_by: userId,
    external_id: externalId(clientCallId),
    'metadata.mode': MODE,
  }).select('_id');
  return doc ? communicationLogService.get(String(doc._id)) : null;
}

/** Record one device call against its lead, once. */
export async function logDeviceCall(raw: unknown, user: AuthUser) {
  const input = parseOrThrow(deviceCallInputSchema, raw);
  const already = await existingLog(user.id, input.client_call_id);
  if (already) return already;

  const lead = await (LEAD_MODELS[input.entity_type] as unknown as {
    findById(id: string): Promise<{ activity_log: unknown[]; save(): Promise<unknown> } | null>;
  }).findById(input.entity_id);
  if (!lead) throw notFound('Lead');

  let log;
  try {
    log = await communicationLogService.create({
      type: 'CALL',
      direction: input.direction,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      provider_name: 'Phone',
      contact_name: input.contact_name ?? '',
      contact_value: input.contact_number,
      body: input.note ?? '',
      status: STATUS_OF[input.outcome],
      duration_seconds: input.duration_seconds,
      external_id: externalId(input.client_call_id),
      // A recording follows separately, if the phone made one; until then there is nothing to transcribe.
      transcript_status: 'NONE',
      created_by: user.id,
      metadata: { mode: MODE, started_at: input.started_at },
    });
  } catch (error) {
    // Two re-sends racing each other: the index let one in, so return that one.
    if (isDuplicateKey(error)) return existingLog(user.id, input.client_call_id);
    throw error;
  }

  lead.activity_log.push({
    type: 'CALL',
    summary: input.note ? `${timelineSummary(input)}: ${input.note}`.slice(0, 500) : timelineSummary(input),
    status: STATUS_OF[input.outcome],
    target: input.contact_number,
    created_by: user.id,
  });
  await lead.save();
  return log;
}

/**
 * Transcribe an uploaded recording and summarise it. Runs after the mutation
 * has answered: the app never waits on speech-to-text, and a failure is stored
 * on the log (transcript_status FAILED) where the portal and the app show it.
 */
export async function transcribeDeviceRecording(logId: string, url: string, fileName?: string | null, contentType?: string | null) {
  const result = await servamService.transcribe({
    audioUrl: url,
    fileName: fileName ?? undefined,
    contentType: contentType ?? undefined,
    withTimestamps: false,
  });
  await communicationLogService.saveTranscript(logId, result.ok ? { transcript: result.transcript } : { error: result.message });
  if (result.ok) summarizeCallInBackground(logId);
}

/** Attach the phone's own recording of a device call, then transcribe and summarise it in the background. */
export async function attachDeviceCallRecording(raw: unknown, user: AuthUser) {
  const input = parseOrThrow(deviceCallRecordingSchema, raw);
  if (!isTrustedMediaUrl(input.recording_url)) {
    throw badInput('recording_url must be a file uploaded through Duncit');
  }
  const doc = await CommunicationLogModel.findById(input.log_id);
  if (doc?.type !== 'CALL' || (doc.metadata as { mode?: string } | null)?.mode !== MODE) {
    throw notFound('Device call');
  }
  if (doc.created_by !== user.id && !hasRole(user, ['SUPER_ADMIN'])) {
    throw forbidden('Only the person who made the call can attach its recording');
  }
  // A re-sent attach of the same file is a no-op: the transcript is already on its way or done.
  if (doc.recording_url === input.recording_url && doc.transcript_status !== 'FAILED') {
    return communicationLogService.get(input.log_id);
  }
  doc.recording_url = input.recording_url;
  doc.transcript_status = 'PENDING';
  await doc.save();
  transcribeOrMarkFailed(input).catch((error: unknown) =>
    logs.server.error('crm', 'device-call-transcript', { error, log_id: input.log_id }),
  );
  return communicationLogService.get(input.log_id);
}

/** Transcribe and summarise the recording; when that fails, say so on the call. */
async function transcribeOrMarkFailed(input: { log_id: string; recording_url: string; file_name?: string | null; content_type?: string | null }) {
  try {
    await transcribeDeviceRecording(input.log_id, input.recording_url, input.file_name, input.content_type);
  } catch (error) {
    logs.server.error('crm', 'device-call-transcript', { error, log_id: input.log_id, msg: 'Device call transcription failed' });
    await communicationLogService.saveTranscript(input.log_id, { error: 'The recording could not be transcribed' });
  }
}
