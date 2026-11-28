import * as SecureStore from 'expo-secure-store';

import { readDirectoryStatus, syncDirectory } from '@/services/directory-sync';
import { gqlRequest } from '@/services/graphql.client';
import { uploadFile } from '@/services/upload';
import { STORAGE_KEYS } from '@/services/secure-storage';
import { readSyncStatus } from '@/services/sync-status';
import { readQueue } from '@/services/recording-queue';
import { useFeaturesStore } from '@/stores/features.store';
import { ApiError } from '@/utils/errors';
import { installId, syncDeviceCalls } from '../call-sync';

const mockPhone = {
  getCallLog: jest.fn(),
  lookupNumber: jest.fn(),
  findRecordings: jest.fn(),
  copyRecordingToCache: jest.fn(),
  deleteCachedRecording: jest.fn(),
  setFeatures: jest.fn(),
};
jest.mock('crm-telephony', () => ({
  get CrmTelephony() {
    return mockPhone;
  },
  CALL_TYPE: { INCOMING: 1, OUTGOING: 2, MISSED: 3, VOICEMAIL: 4, REJECTED: 5, BLOCKED: 6 },
}));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/services/upload', () => ({
  RECORDINGS_FOLDER: 'call-recordings',
  uploadFile: jest.fn(),
}));
const mockAudioAccess = jest.fn();
jest.mock('@/services/permissions', () => ({ hasAudioAccess: () => mockAudioAccess() }));
jest.mock('@/services/directory-sync', () => ({
  readDirectoryStatus: jest.fn(),
  syncDirectory: jest.fn(),
}));

/**
 * The call sync: calls with CRM contacts reach the lead's communication log
 * (with the phone's recording), everything else stays on the phone, and a
 * failure is retried from where it stopped.
 */

const request = gqlRequest as jest.Mock;
const upload = uploadFile as jest.Mock;
const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
/** Calls from a few minutes ago: their recordings may still appear (recording-queue FIND_WINDOW_MS). */
const START = Date.now() - 5 * 60 * 1000;

const lead = {
  entityType: 'VENUE_LEAD',
  leadId: 'lead-1',
  leadName: 'Smash Arena',
  contactName: 'Rohit',
  others: 0,
};
const crmCall = {
  id: '11',
  number: '9811000001',
  type: 2,
  date: START,
  durationSeconds: 90,
  cachedName: '',
};
const personalCall = {
  id: '12',
  number: '9000000000',
  type: 1,
  date: START + 60_000,
  durationSeconds: 300,
  cachedName: 'Mum',
};

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
  store.set(STORAGE_KEYS.callCheckpoint, String(START - 1));
  store.set(STORAGE_KEYS.installId, 'install-a');
  useFeaturesStore.setState({ autoLog: true, recordings: true, callerId: true, hydrated: true });
  mockAudioAccess.mockResolvedValue(true);
  // A directory synced a moment ago: an unknown number is a personal call, not a stale directory.
  (readDirectoryStatus as jest.Mock).mockResolvedValue({ syncedAt: Date.now(), count: 1 });
  mockPhone.lookupNumber.mockImplementation(async (n: string) =>
    n === crmCall.number ? lead : null,
  );
  mockPhone.findRecordings.mockResolvedValue([]);
  request.mockImplementation(
    async (_doc: unknown, vars: { input: { client_call_id?: string; log_id?: string } }) => {
      if (vars.input.client_call_id)
        return { logCrmDeviceCall: { id: 'log-1', recording_url: '', transcript_status: 'NONE' } };
      return {
        attachCrmDeviceCallRecording: {
          id: vars.input.log_id,
          recording_url: 'https://ik.imagekit.io/r.m4a',
          transcript_status: 'PENDING',
        },
      };
    },
  );
});

it('logs the CRM call, skips the personal one without sending its number, and moves the checkpoint past both', async () => {
  mockPhone.getCallLog.mockResolvedValue([crmCall, personalCall]);

  const result = await syncDeviceCalls();

  expect(result).toEqual({
    logged: 1,
    recordings: 0,
    skipped: 1,
    refused: 0,
    pendingRecordings: 1,
    recordingsBlocked: false,
    failed: false,
  });
  expect(request).toHaveBeenCalledTimes(1);
  expect(syncDirectory).not.toHaveBeenCalled();
  expect(request.mock.calls[0][1].input).toMatchObject({
    client_call_id: 'install-a:11',
    entity_type: 'VENUE_LEAD',
    entity_id: 'lead-1',
    contact_number: '9811000001',
    direction: 'OUTBOUND',
    outcome: 'COMPLETED',
    duration_seconds: 90,
  });
  expect(JSON.stringify(request.mock.calls)).not.toContain('9000000000');
  expect(store.get(STORAGE_KEYS.callCheckpoint)).toBe(String(personalCall.date));
  // Only the CRM call is remembered as logged; the personal number is kept nowhere.
  const status = await readSyncStatus();
  expect(status.recent).toEqual([{ k: '9811000001', d: START }]);
  expect(JSON.stringify(status)).not.toContain('9000000000');
});

it('refreshes a stale directory before calling a number personal, so a lead added today is logged', async () => {
  (readDirectoryStatus as jest.Mock).mockResolvedValue({
    syncedAt: Date.now() - 60 * 60 * 1000,
    count: 1,
  });
  const newLead = { ...crmCall, id: '13', number: '9811000002' };
  let refreshed = false;
  (syncDirectory as jest.Mock).mockImplementation(async () => {
    refreshed = true;
    return 2;
  });
  mockPhone.lookupNumber.mockImplementation(async (n: string) =>
    n === newLead.number && refreshed ? { ...lead, leadId: 'lead-2' } : null,
  );
  mockPhone.getCallLog.mockResolvedValue([newLead, personalCall]);

  const result = await syncDeviceCalls();

  expect(result.logged).toBe(1);
  expect(request.mock.calls[0][1].input).toMatchObject({
    entity_id: 'lead-2',
    client_call_id: 'install-a:13',
  });
  // Once per run: the personal call after it does not download the directory again.
  expect(syncDirectory).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(request.mock.calls)).not.toContain('9000000000');
});

it('steps over a call the server refuses for good, records why, and still logs the calls after it', async () => {
  const second = { ...crmCall, id: '14', date: START + 120_000 };
  mockPhone.getCallLog.mockResolvedValue([crmCall, second]);
  request.mockRejectedValueOnce(new ApiError('Lead not found', 200, { code: 'NOT_FOUND' }));

  const result = await syncDeviceCalls();

  expect(result).toMatchObject({ logged: 1, refused: 1, failed: false });
  expect(store.get(STORAGE_KEYS.callCheckpoint)).toBe(String(second.date));
  expect((await readSyncStatus()).failures).toEqual([
    { at: expect.any(Number), code: 'NOT_FOUND', what: 'call' },
  ]);
});

it('keeps a recording that is not saved yet, and attaches it on a later run', async () => {
  mockPhone.getCallLog.mockResolvedValueOnce([crmCall]).mockResolvedValue([]);
  const first = await syncDeviceCalls();
  expect(first).toMatchObject({ logged: 1, recordings: 0, pendingRecordings: 1 });
  expect((await readQueue()).map((q) => q.logId)).toEqual(['log-1']);

  mockPhone.findRecordings.mockResolvedValue([
    {
      uri: 'content://2',
      name: 'Call recording Rohit_241124_1000.m4a',
      sizeBytes: 900,
      addedAtMs: START + 100_000,
      durationMs: 90_000,
      mimeType: 'audio/mp4',
      relativePath: 'Recordings/Call/',
    },
  ]);
  mockPhone.copyRecordingToCache.mockResolvedValue('file:///cache/recordings/r.m4a');
  upload.mockResolvedValue('https://ik.imagekit.io/r.m4a');

  const second = await syncDeviceCalls();

  expect(second).toMatchObject({ logged: 0, recordings: 1, pendingRecordings: 0 });
  expect(await readQueue()).toEqual([]);
  expect((await readSyncStatus()).recordingAt).toEqual(expect.any(Number));
});

it('holds waiting recordings while the phone hides audio files, and attaches them once access is given', async () => {
  mockAudioAccess.mockResolvedValue(false);
  mockPhone.getCallLog.mockResolvedValueOnce([crmCall]).mockResolvedValue([]);

  const blocked = await syncDeviceCalls();

  // Nothing can be found without access, so nothing is looked for, and the call is not aged out.
  expect(blocked).toMatchObject({ logged: 1, recordingsBlocked: true, pendingRecordings: 1 });
  expect(mockPhone.findRecordings).not.toHaveBeenCalled();
  expect((await readQueue()).map((q) => q.logId)).toEqual(['log-1']);

  mockAudioAccess.mockResolvedValue(true);
  mockPhone.findRecordings.mockResolvedValue([
    {
      uri: 'content://3',
      name: 'Rohit_241124_1000.m4a',
      sizeBytes: 900,
      // Indexed long after the call; the recorder finished writing it at hang-up.
      addedAtMs: START + 5 * 60 * 60 * 1000,
      modifiedAtMs: START + 95_000,
      durationMs: 90_000,
      mimeType: 'audio/mp4',
      relativePath: 'Recordings/Call/',
    },
  ]);
  mockPhone.copyRecordingToCache.mockResolvedValue('file:///cache/recordings/r.m4a');
  upload.mockResolvedValue('https://ik.imagekit.io/r.m4a');

  const allowed = await syncDeviceCalls();

  expect(allowed).toMatchObject({ recordings: 1, pendingRecordings: 0, recordingsBlocked: false });
  expect(await readQueue()).toEqual([]);
});

it('drops what was waiting when recordings are switched off', async () => {
  mockPhone.getCallLog.mockResolvedValueOnce([crmCall]).mockResolvedValue([]);
  await syncDeviceCalls();
  expect(await readQueue()).toHaveLength(1);

  useFeaturesStore.setState({ recordings: false });
  await syncDeviceCalls();

  expect(await readQueue()).toEqual([]);
  expect(upload).not.toHaveBeenCalled();
});

it('uploads and attaches the phone recording, then deletes the cached copy', async () => {
  mockPhone.getCallLog.mockResolvedValue([crmCall]);
  mockPhone.findRecordings.mockResolvedValue([
    {
      uri: 'content://1',
      name: 'Call_9811000001.m4a',
      sizeBytes: 500,
      addedAtMs: START + 95_000,
      durationMs: 0,
      mimeType: 'audio/mp4',
      relativePath: 'Recordings/Call/',
    },
  ]);
  mockPhone.copyRecordingToCache.mockResolvedValue('file:///cache/recordings/Call_9811000001.m4a');
  upload.mockResolvedValue('https://ik.imagekit.io/r.m4a');

  const result = await syncDeviceCalls();

  expect(result.recordings).toBe(1);
  expect(upload).toHaveBeenCalledWith(
    {
      uri: 'file:///cache/recordings/Call_9811000001.m4a',
      name: 'Call_9811000001.m4a',
      type: 'audio/mp4',
    },
    'call-recordings',
  );
  expect(request.mock.calls[1][1].input).toEqual({
    log_id: 'log-1',
    recording_url: 'https://ik.imagekit.io/r.m4a',
    file_name: 'Call_9811000001.m4a',
    content_type: 'audio/mp4',
  });
  expect(mockPhone.deleteCachedRecording).toHaveBeenCalledWith(
    'file:///cache/recordings/Call_9811000001.m4a',
  );
});

it('does not look for a recording when recordings are switched off, or when one is already attached', async () => {
  mockPhone.getCallLog.mockResolvedValue([crmCall]);
  useFeaturesStore.setState({ recordings: false });
  await syncDeviceCalls();
  expect(mockPhone.findRecordings).not.toHaveBeenCalled();

  useFeaturesStore.setState({ recordings: true });
  store.set(STORAGE_KEYS.callCheckpoint, String(START - 1));
  request.mockResolvedValueOnce({
    logCrmDeviceCall: { id: 'log-1', recording_url: 'https://already', transcript_status: 'READY' },
  });
  await syncDeviceCalls();
  expect(mockPhone.findRecordings).not.toHaveBeenCalled();
});

it('stops at a failure and keeps the checkpoint before it, so the call is retried next time', async () => {
  mockPhone.getCallLog.mockResolvedValue([crmCall]);
  request.mockRejectedValueOnce(new Error('offline'));

  const result = await syncDeviceCalls();

  expect(result.failed).toBe(true);
  expect(store.get(STORAGE_KEYS.callCheckpoint)).toBe(String(START - 1));
});

it('starts logging from now the first time, never from the phone history', async () => {
  store.delete(STORAGE_KEYS.callCheckpoint);
  const result = await syncDeviceCalls();
  expect(result).toEqual({
    logged: 0,
    recordings: 0,
    skipped: 0,
    refused: 0,
    pendingRecordings: 0,
    recordingsBlocked: false,
    failed: false,
  });
  expect(mockPhone.getCallLog).not.toHaveBeenCalled();
  expect(Number(store.get(STORAGE_KEYS.callCheckpoint))).toBeGreaterThan(START);
});

it('does nothing while call logging is switched off', async () => {
  useFeaturesStore.setState({ autoLog: false });
  await syncDeviceCalls();
  expect(mockPhone.getCallLog).not.toHaveBeenCalled();
});

it('runs one sync at a time: a second caller shares the run in flight', async () => {
  mockPhone.getCallLog.mockResolvedValue([]);
  const [a, b] = [syncDeviceCalls(), syncDeviceCalls()];
  expect(a).toBe(b);
  await a;
  expect(mockPhone.getCallLog).toHaveBeenCalledTimes(1);
});

it('mints a stable install id once', async () => {
  store.delete(STORAGE_KEYS.installId);
  const first = await installId();
  expect(first).toBe('installuuid');
  expect(await installId()).toBe(first);
});
