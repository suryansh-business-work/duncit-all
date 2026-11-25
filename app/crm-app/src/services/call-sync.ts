import { logs } from '@duncit/logs';
import { randomUUID } from 'expo-crypto';
import {
  CrmTelephony,
  type CallLogEntry,
  type CrmTelephonyModule,
  type DirectoryMatch,
} from 'crm-telephony';

import { CrmAppLogDeviceCallDocument } from '@/graphql/comms';
import { callKey, planCall } from '@/features/calls/callPlan';
import { readDirectoryStatus, syncDirectory } from '@/services/directory-sync';
import { gqlRequest } from '@/services/graphql.client';
import {
  attachQueuedRecordings,
  clearRecordingQueue,
  queueRecording,
} from '@/services/recording-queue';
import { readValue, STORAGE_KEYS, writeValue } from '@/services/secure-storage';
import {
  failureCode,
  isPermanentSyncError,
  updateSyncStatus,
  type LoggedCall,
  type SyncFailure,
} from '@/services/sync-status';
import { useFeaturesStore } from '@/stores/features.store';

/**
 * Sends calls with CRM contacts to the lead's communication log, then attaches
 * the phone's own recording when it appears (the server transcribes and
 * summarises it). Runs on app open, right after a CRM call (the phone side
 * schedules it), and in the background.
 *
 * Privacy: each call is matched against the on-device CRM directory, and a
 * call with any other number is skipped on the phone — its number is never
 * sent anywhere. A number the directory does not know first refreshes the
 * directory (a lead added since the last sync), still without sending it.
 * Logging starts when the person switches it on (the checkpoint).
 *
 * The checkpoint moves past a call once it is handled: logged, skipped, or
 * refused for good (a deleted lead — recorded for Settings, never retried).
 * A passing failure (offline, signed out) stops the run at that call, and the
 * server's client_call_id makes the retry a no-op for whatever already landed.
 */

const BATCH = 100;
/** A number the directory does not know refreshes it first: once a run, and only when older than this. */
export const REFRESH_ON_MISS_MS = 10 * 60 * 1000;

export interface CallSyncResult {
  logged: number;
  recordings: number;
  skipped: number;
  /** Calls the server refused for good (recorded under Settings › Calling & recording). */
  refused: number;
  /** Logged calls still waiting for their recording. */
  pendingRecordings: number;
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

interface RunState {
  refreshed: boolean;
}

/** The lead behind a number: the directory, refreshed once if it may simply be out of date. */
async function matchLead(
  phone: CrmTelephonyModule,
  entry: CallLogEntry,
  state: RunState,
): Promise<DirectoryMatch | null> {
  const local = await phone.lookupNumber(entry.number);
  if (local || state.refreshed || !callKey(entry.number)) return local;
  const { syncedAt } = await readDirectoryStatus();
  if (syncedAt !== null && Date.now() - syncedAt < REFRESH_ON_MISS_MS) return null;
  state.refreshed = true;
  await syncDirectory();
  return phone.lookupNumber(entry.number);
}

async function handle(
  phone: CrmTelephonyModule,
  entry: CallLogEntry,
  id: string,
  recordings: boolean,
  state: RunState,
): Promise<LoggedCall | null> {
  const call = planCall(entry, await matchLead(phone, entry, state), id);
  if (!call) return null;
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
  // A call that ran may have a recording; one already attached (an earlier run) needs nothing.
  if (recordings && call.outcome === 'COMPLETED' && !logCrmDeviceCall.recording_url)
    await queueRecording({ logId: logCrmDeviceCall.id, call });
  return { k: callKey(entry.number), d: entry.date };
}

async function logNewCalls(
  phone: CrmTelephonyModule,
  since: number,
  recordings: boolean,
  result: CallSyncResult,
): Promise<void> {
  const id = await installId();
  const state: RunState = { refreshed: false };
  const logged: LoggedCall[] = [];
  const failures: SyncFailure[] = [];
  for (const entry of await phone.getCallLog(since, BATCH)) {
    try {
      const call = await handle(phone, entry, id, recordings, state);
      if (call) logged.push(call);
      else result.skipped += 1;
    } catch (error) {
      if (!isPermanentSyncError(error)) {
        logs.mobileApp.warn('crm-app/call-sync', 'handle', {
          error,
          msg: 'Call sync stopped; it resumes from this call next time',
        });
        result.failed = true;
        break;
      }
      failures.push({ at: Date.now(), code: failureCode(error), what: 'call' });
      result.refused += 1;
    }
    await writeValue(STORAGE_KEYS.callCheckpoint, String(entry.date));
  }
  result.logged = logged.length;
  await updateSyncStatus((s) => ({
    ...s,
    callAt: result.failed ? s.callAt : Date.now(),
    recent: [...s.recent, ...logged],
    failures: [...s.failures, ...failures],
  }));
}

async function run(): Promise<CallSyncResult> {
  const result: CallSyncResult = {
    logged: 0,
    recordings: 0,
    skipped: 0,
    refused: 0,
    pendingRecordings: 0,
    failed: false,
  };
  const { autoLog, recordings } = useFeaturesStore.getState();
  const phone = CrmTelephony;
  if (!phone || !autoLog) return result;
  const raw = await readValue(STORAGE_KEYS.callCheckpoint);
  if (!raw) {
    await writeValue(STORAGE_KEYS.callCheckpoint, String(Date.now()));
    return result;
  }
  await logNewCalls(phone, Number(raw), recordings, result);
  if (!recordings) {
    // Switched off: what was waiting is never uploaded.
    await clearRecordingQueue();
    return result;
  }
  const queue = await attachQueuedRecordings(phone);
  result.recordings = queue.attached;
  result.pendingRecordings = queue.pending;
  return result;
}

/** One sync at a time: a second caller waits for the run already in flight. */
export function syncDeviceCalls(): Promise<CallSyncResult> {
  running ??= run().finally(() => {
    running = null;
  });
  return running;
}
