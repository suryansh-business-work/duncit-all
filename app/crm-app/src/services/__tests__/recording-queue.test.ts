import * as SecureStore from 'expo-secure-store';
import type { CrmTelephonyModule } from 'crm-telephony';

import type { PlannedCall } from '@/features/calls/callPlan';
import { gqlRequest } from '@/services/graphql.client';
import { readSyncStatus } from '@/services/sync-status';
import { uploadFile } from '@/services/upload';
import { ApiError } from '@/utils/errors';
import {
  attachQueuedRecordings,
  FIND_WINDOW_MS,
  GIVE_UP_MS,
  queueRecording,
  readQueue,
} from '../recording-queue';

jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/services/upload', () => ({
  RECORDINGS_FOLDER: 'call-recordings',
  uploadFile: jest.fn(),
}));

/**
 * Recordings that were not on the phone yet when their call was logged: they
 * wait, are attached when the file appears, and are dropped when it never does
 * or when the server refuses the file — never retried forever.
 */

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const upload = uploadFile as jest.Mock;
const ENDED = Date.UTC(2026, 10, 25, 9, 0);

const call: PlannedCall = {
  clientCallId: 'install-a:21',
  entry: {
    id: '21',
    number: '9811000001',
    type: 2,
    date: ENDED - 60_000,
    durationSeconds: 60,
    cachedName: '',
  },
  lead: { entityType: 'HOST_LEAD', leadId: 'h1', leadName: 'Riya', contactName: 'Riya', others: 0 },
  entityType: 'HOST_LEAD',
  direction: 'OUTBOUND',
  outcome: 'COMPLETED',
  startedAt: new Date(ENDED - 60_000).toISOString(),
};
const file = {
  uri: 'content://9',
  name: 'Call recording Riya_251125_0859.m4a',
  sizeBytes: 800,
  addedAtMs: ENDED + 2_000,
  durationMs: 60_000,
  mimeType: 'audio/mp4',
  relativePath: 'Recordings/Call/',
};
const phone = {
  findRecordings: jest.fn(),
  copyRecordingToCache: jest.fn(async () => 'file:///cache/recordings/r.m4a'),
  deleteCachedRecording: jest.fn(async () => true),
} as unknown as CrmTelephonyModule & { findRecordings: jest.Mock };

beforeEach(async () => {
  store.clear();
  jest.clearAllMocks();
  (gqlRequest as jest.Mock).mockResolvedValue({ attachCrmDeviceCallRecording: { id: 'log-9' } });
  await queueRecording({ logId: 'log-9', call });
});

it('keeps waiting while the file may still appear', async () => {
  phone.findRecordings.mockResolvedValue([]);
  const result = await attachQueuedRecordings(phone, ENDED + FIND_WINDOW_MS - 1);
  expect(result).toEqual({ attached: 0, pending: 1, failed: false });
  expect(await readQueue()).toHaveLength(1);
});

it('gives up quietly once the file has had time to appear and did not (recording was off)', async () => {
  phone.findRecordings.mockResolvedValue([]);
  const result = await attachQueuedRecordings(phone, ENDED + FIND_WINDOW_MS + 1);
  expect(result.pending).toBe(0);
  expect((await readSyncStatus()).failures).toEqual([]);
});

it('attaches the file once it appears, deletes the cached copy and records the sync time', async () => {
  phone.findRecordings.mockResolvedValue([file]);
  upload.mockResolvedValue('https://ik.imagekit.io/r.m4a');
  const result = await attachQueuedRecordings(phone, ENDED + 60_000);
  expect(result).toEqual({ attached: 1, pending: 0, failed: false });
  expect((gqlRequest as jest.Mock).mock.calls[0][1].input).toEqual({
    log_id: 'log-9',
    recording_url: 'https://ik.imagekit.io/r.m4a',
    file_name: file.name,
    content_type: 'audio/mp4',
  });
  expect(phone.deleteCachedRecording).toHaveBeenCalledWith('file:///cache/recordings/r.m4a');
  expect((await readSyncStatus()).recordingAt).toBe(ENDED + 60_000);
});

it('drops a file the server refuses for good and records why', async () => {
  phone.findRecordings.mockResolvedValue([file]);
  upload.mockRejectedValue(new ApiError('Upload failed (HTTP 413)', 413));
  const result = await attachQueuedRecordings(phone, ENDED + 60_000);
  expect(result).toEqual({ attached: 0, pending: 0, failed: false });
  expect((await readSyncStatus()).failures).toEqual([
    { at: ENDED + 60_000, code: 'HTTP_413', what: 'recording' },
  ]);
  expect(phone.deleteCachedRecording).toHaveBeenCalled();
});

it('retries an upload that failed for a passing reason, until a day has gone by', async () => {
  phone.findRecordings.mockResolvedValue([file]);
  upload.mockRejectedValue(new Error('Network request failed'));
  expect(await attachQueuedRecordings(phone, ENDED + 60_000)).toEqual({
    attached: 0,
    pending: 1,
    failed: true,
  });
  expect(await attachQueuedRecordings(phone, ENDED + GIVE_UP_MS + 1)).toMatchObject({ pending: 0 });
  expect((await readSyncStatus()).failures[0]).toMatchObject({
    code: 'UNKNOWN',
    what: 'recording',
  });
});

it('queues each logged call once, however often it is queued', async () => {
  await queueRecording({ logId: 'log-9', call });
  expect(await readQueue()).toHaveLength(1);
});
