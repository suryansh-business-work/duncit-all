import { logs } from '@duncit/logs';
import { randomUUID } from 'expo-crypto';
import { CrmTelephony, type CallLogEntry, type CrmTelephonyModule } from 'crm-telephony';

import { CrmAppAttachRecordingDocument, CrmAppLogDeviceCallDocument } from '@/graphql/comms';
import { planCall, type PlannedCall } from '@/features/calls/callPlan';
import { audioContentType, pickRecording, recordingWindow } from '@/features/calls/recordingMatch';
import { gqlRequest } from '@/services/graphql.client';
import { readValue, STORAGE_KEYS, writeValue } from '@/services/secure-storage';
import { RECORDINGS_FOLDER, uploadFile } from '@/services/upload';
import { useFeaturesStore } from '@/stores/features.store';

/**
 * Sends calls with CRM contacts to the lead's communication log, with the
 * phone's own recording when there is one (the server transcribes and
 * summarises it). Runs on app open, after a call, and in the background.
 *
 * Privacy: each call is matched against the on-device CRM directory, and a
 * call with any other number is skipped on the phone — its number is never
 * sent anywhere. Logging starts when the person switches it on (the
 * checkpoint), never from the phone's older history.
 *
 * The checkpoint moves past a call only once it is fully handled, so a call
 * whose upload failed is retried next time; the server's client_call_id makes
 * the retry a no-op for whatever already landed.
 */

const BATCH = 100;

export interface CallSyncResult {
  logged: number;
  recordings: number;
  skipped: number;
  failed: boolean;
}

let running: Promise<CallSyncResult> | null = null;

/** A stable id for this install, so two phones of one person never collide. */
export async function installId(): Promise<string> {
  const existing = await readValue(STORAGE_KEYS.installId);
  if (existing) return existing;
  const id = randomUUID().replaceAll('-', '').slice(0, 16);
  await writeValue(STORAGE_KEYS.installId, id);
  return id;
}

async function attachRecording(
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

async function handle(
  phone: CrmTelephonyModule,
  entry: CallLogEntry,
  id: string,
  recordings: boolean,
): Promise<'logged' | 'recorded' | 'skipped'> {
  const lead = await phone.lookupNumber(entry.number);
  const call = planCall(entry, lead, id);
  if (!call) return 'skipped';
  const { logCrmDeviceCall } = await gqlRequest(CrmAppLogDeviceCallDocument, {
    input: {
      client_call_id: call.clientCallId,
      entity_type: call.entityType,
      entity_id: call.lead.leadId,
      contact_number: entry.number,
      contact_name: call.lead.contactName || entry.cachedName || null,
      direction: call.direction,
      outcome: call.outcome,
      started_at: call.startedAt,
      duration_seconds: entry.durationSeconds,
    },
  });
  // Already attached on an earlier run (the server returned the existing log).
  if (!recordings || logCrmDeviceCall.recording_url) return 'logged';
  return (await attachRecording(phone, call, logCrmDeviceCall.id)) ? 'recorded' : 'logged';
}

async function run(): Promise<CallSyncResult> {
  const result: CallSyncResult = { logged: 0, recordings: 0, skipped: 0, failed: false };
  const { autoLog, recordings } = useFeaturesStore.getState();
  const phone = CrmTelephony;
  if (!phone || !autoLog) return result;
  const raw = await readValue(STORAGE_KEYS.callCheckpoint);
  if (!raw) {
    await writeValue(STORAGE_KEYS.callCheckpoint, String(Date.now()));
    return result;
  }
  const id = await installId();
  const entries = await phone.getCallLog(Number(raw), BATCH);
  for (const entry of entries) {
    try {
      const outcome = await handle(phone, entry, id, recordings);
      if (outcome === 'skipped') result.skipped += 1;
      else result.logged += 1;
      if (outcome === 'recorded') result.recordings += 1;
      await writeValue(STORAGE_KEYS.callCheckpoint, String(entry.date));
    } catch (error) {
      logs.mobileApp.warn('crm-app/call-sync', 'handle', {
        error,
        msg: 'Call sync stopped; it resumes from this call next time',
      });
      result.failed = true;
      break;
    }
  }
  return result;
}

/** One sync at a time: a second caller waits for the run already in flight. */
export function syncDeviceCalls(): Promise<CallSyncResult> {
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}
