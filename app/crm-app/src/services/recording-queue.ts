import { logs } from '@duncit/logs';
import type { CrmTelephonyModule } from 'crm-telephony';

import { CrmAppAttachRecordingDocument } from '@/graphql/comms';
import type { PlannedCall } from '@/features/calls/callPlan';
import { audioContentType, pickRecording, recordingWindow } from '@/features/calls/recordingMatch';
import { gqlRequest } from '@/services/graphql.client';
import { readValue, STORAGE_KEYS, writeValue } from '@/services/secure-storage';
import { failureCode, isPermanentSyncError, updateSyncStatus } from '@/services/sync-status';
import { RECORDINGS_FOLDER, uploadFile } from '@/services/upload';

/**
 * Recordings still to attach. The phone's recorder saves its file a moment
 * after hang-up — often after the sync that logged the call has run — so a
 * logged call without a recording waits here and every later sync looks again.
 * A call whose file never appears is dropped after FIND_WINDOW_MS (recording
 * was off); an upload that failed for a passing reason is retried until
 * GIVE_UP_MS. Only calls already matched to a CRM lead are ever queued.
 */

export interface PendingRecording {
  logId: string;
  call: PlannedCall;
}

/** How long after a call ends its recording may still appear. */
export const FIND_WINDOW_MS = 30 * 60 * 1000;
/** How long a failing upload keeps being retried. */
export const GIVE_UP_MS = 24 * 60 * 60 * 1000;
/** A runaway queue never grows past this; the oldest call goes first. */
const MAX_QUEUED = 10;

const callEnd = (call: PlannedCall) => call.entry.date + call.entry.durationSeconds * 1000;

export async function readQueue(): Promise<PendingRecording[]> {
  const raw = await readValue(STORAGE_KEYS.pendingRecordings);
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? (value as PendingRecording[]) : [];
  } catch {
    return [];
  }
}

const writeQueue = (queue: readonly PendingRecording[]) =>
  writeValue(STORAGE_KEYS.pendingRecordings, JSON.stringify(queue.slice(-MAX_QUEUED)));

/** Recordings switched off: nothing that was waiting is uploaded. */
export const clearRecordingQueue = () => writeQueue([]);

export async function queueRecording(item: PendingRecording): Promise<void> {
  const queue = (await readQueue()).filter((q) => q.logId !== item.logId);
  await writeQueue([...queue, item]);
}

/** Find, upload and attach one call's recording. False when the phone has no file for it yet. */
export async function attachRecording(
  phone: CrmTelephonyModule,
  call: PlannedCall,
  logId: string,
): Promise<boolean> {
  const { fromMs, toMs } = recordingWindow(call);
  const file = pickRecording(call, await phone.findRecordings(fromMs, toMs));
  if (!file) return false;
  const cached = await phone.copyRecordingToCache(file.uri, file.name);
  try {
    const type = audioContentType(file);
    const url = await uploadFile({ uri: cached, name: file.name, type }, RECORDINGS_FOLDER);
    await gqlRequest(CrmAppAttachRecordingDocument, {
      input: { log_id: logId, recording_url: url, file_name: file.name, content_type: type },
    });
    return true;
  } finally {
    await phone.deleteCachedRecording(cached);
  }
}

export interface QueueResult {
  attached: number;
  pending: number;
  failed: boolean;
}

type Outcome = 'attached' | 'keep' | 'drop' | 'retry';

async function attempt(
  phone: CrmTelephonyModule,
  item: PendingRecording,
  now: number,
): Promise<Outcome> {
  const age = now - callEnd(item.call);
  try {
    if (await attachRecording(phone, item.call, item.logId)) return 'attached';
    return age < FIND_WINDOW_MS ? 'keep' : 'drop';
  } catch (error) {
    if (isPermanentSyncError(error) || age >= GIVE_UP_MS) {
      await updateSyncStatus((s) => ({
        ...s,
        failures: [...s.failures, { at: now, code: failureCode(error), what: 'recording' }],
      }));
      return 'drop';
    }
    logs.mobileApp.warn('crm-app/recording-queue', 'attach', {
      error,
      msg: 'Recording upload failed; it is retried on the next sync',
    });
    return 'retry';
  }
}

/** Try every queued recording once; keep what may still arrive or may still upload. */
export async function attachQueuedRecordings(
  phone: CrmTelephonyModule,
  now = Date.now(),
): Promise<QueueResult> {
  const queue = await readQueue();
  const result: QueueResult = { attached: 0, pending: 0, failed: false };
  if (queue.length === 0) return result;
  const keep: PendingRecording[] = [];
  for (const item of queue) {
    const outcome = await attempt(phone, item, now);
    if (outcome === 'attached') result.attached += 1;
    if (outcome === 'keep' || outcome === 'retry') keep.push(item);
    if (outcome === 'retry') result.failed = true;
  }
  await writeQueue(keep);
  result.pending = keep.length;
  if (result.attached > 0) await updateSyncStatus((s) => ({ ...s, recordingAt: now }));
  return result;
}
