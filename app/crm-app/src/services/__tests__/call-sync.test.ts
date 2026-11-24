import * as SecureStore from 'expo-secure-store';

const phone = {
  getCallLog: jest.fn(),
  lookupNumber: jest.fn(),
  findRecordings: jest.fn(),
  copyRecordingToCache: jest.fn(),
  deleteCachedRecording: jest.fn(),
  setFeatures: jest.fn(),
};
jest.mock('crm-telephony', () => ({
  CrmTelephony: phone,
  CALL_TYPE: { INCOMING: 1, OUTGOING: 2, MISSED: 3, VOICEMAIL: 4, REJECTED: 5, BLOCKED: 6 },
}));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));
jest.mock('@/services/upload', () => ({ RECORDINGS_FOLDER: 'call-recordings', uploadFile: jest.fn() }));

import { gqlRequest } from '@/services/graphql.client';
import { uploadFile } from '@/services/upload';
import { STORAGE_KEYS } from '@/services/secure-storage';
import { useFeaturesStore } from '@/stores/features.store';
import { installId, syncDeviceCalls } from '../call-sync';

/**
 * The call sync: calls with CRM contacts reach the lead's communication log
 * (with the phone's recording), everything else stays on the phone, and a
 * failure is retried from where it stopped.
 */

const request = gqlRequest as jest.Mock;
const upload = uploadFile as jest.Mock;
const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const START = Date.UTC(2026, 10, 24, 10, 0);

const lead = { entityType: 'VENUE_LEAD', leadId: 'lead-1', leadName: 'Smash Arena', contactName: 'Rohit', others: 0 };
const crmCall = { id: '11', number: '9811000001', type: 2, date: START, durationSeconds: 90, cachedName: '' };
const personalCall = { id: '12', number: '9000000000', type: 1, date: START + 60_000, durationSeconds: 300, cachedName: 'Mum' };

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
  store.set(STORAGE_KEYS.callCheckpoint, String(START - 1));
  store.set(STORAGE_KEYS.installId, 'install-a');
  useFeaturesStore.setState({ autoLog: true, recordings: true, callerId: true, hydrated: true });
  phone.lookupNumber.mockImplementation(async (n: string) => (n === crmCall.number ? lead : null));
  phone.findRecordings.mockResolvedValue([]);
  request.mockImplementation(async (_doc: unknown, vars: { input: { client_call_id?: string; log_id?: string } }) => {
    if (vars.input.client_call_id) return { logCrmDeviceCall: { id: 'log-1', recording_url: '', transcript_status: 'NONE' } };
    return { attachCrmDeviceCallRecording: { id: vars.input.log_id, recording_url: 'https://ik.imagekit.io/r.m4a', transcript_status: 'PENDING' } };
  });
});

it('logs the CRM call, skips the personal one without sending its number, and moves the checkpoint past both', async () => {
  phone.getCallLog.mockResolvedValue([crmCall, personalCall]);

  const result = await syncDeviceCalls();

  expect(result).toEqual({ logged: 1, recordings: 0, skipped: 1, failed: false });
  expect(request).toHaveBeenCalledTimes(1);
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
});

it('uploads and attaches the phone recording, then deletes the cached copy', async () => {
  phone.getCallLog.mockResolvedValue([crmCall]);
  phone.findRecordings.mockResolvedValue([
    { uri: 'content://1', name: 'Call_9811000001.m4a', sizeBytes: 500, addedAtMs: START + 95_000, durationMs: 0, mimeType: 'audio/mp4', relativePath: 'Recordings/Call/' },
  ]);
  phone.copyRecordingToCache.mockResolvedValue('file:///cache/recordings/Call_9811000001.m4a');
  upload.mockResolvedValue('https://ik.imagekit.io/r.m4a');

  const result = await syncDeviceCalls();

  expect(result.recordings).toBe(1);
  expect(upload).toHaveBeenCalledWith({ uri: 'file:///cache/recordings/Call_9811000001.m4a', name: 'Call_9811000001.m4a', type: 'audio/mp4' }, 'call-recordings');
  expect(request.mock.calls[1][1].input).toEqual({ log_id: 'log-1', recording_url: 'https://ik.imagekit.io/r.m4a', file_name: 'Call_9811000001.m4a', content_type: 'audio/mp4' });
  expect(phone.deleteCachedRecording).toHaveBeenCalledWith('file:///cache/recordings/Call_9811000001.m4a');
});

it('does not look for a recording when recordings are switched off, or when one is already attached', async () => {
  phone.getCallLog.mockResolvedValue([crmCall]);
  useFeaturesStore.setState({ recordings: false });
  await syncDeviceCalls();
  expect(phone.findRecordings).not.toHaveBeenCalled();

  useFeaturesStore.setState({ recordings: true });
  store.set(STORAGE_KEYS.callCheckpoint, String(START - 1));
  request.mockResolvedValueOnce({ logCrmDeviceCall: { id: 'log-1', recording_url: 'https://already', transcript_status: 'READY' } });
  await syncDeviceCalls();
  expect(phone.findRecordings).not.toHaveBeenCalled();
});

it('stops at a failure and keeps the checkpoint before it, so the call is retried next time', async () => {
  phone.getCallLog.mockResolvedValue([crmCall]);
  request.mockRejectedValueOnce(new Error('offline'));

  const result = await syncDeviceCalls();

  expect(result.failed).toBe(true);
  expect(store.get(STORAGE_KEYS.callCheckpoint)).toBe(String(START - 1));
});

it('starts logging from now the first time, never from the phone history', async () => {
  store.delete(STORAGE_KEYS.callCheckpoint);
  const result = await syncDeviceCalls();
  expect(result).toEqual({ logged: 0, recordings: 0, skipped: 0, failed: false });
  expect(phone.getCallLog).not.toHaveBeenCalled();
  expect(Number(store.get(STORAGE_KEYS.callCheckpoint))).toBeGreaterThan(START);
});

it('does nothing while call logging is switched off', async () => {
  useFeaturesStore.setState({ autoLog: false });
  await syncDeviceCalls();
  expect(phone.getCallLog).not.toHaveBeenCalled();
});

it('runs one sync at a time: a second caller shares the run in flight', async () => {
  phone.getCallLog.mockResolvedValue([]);
  const [a, b] = [syncDeviceCalls(), syncDeviceCalls()];
  expect(a).toBe(b);
  await a;
  expect(phone.getCallLog).toHaveBeenCalledTimes(1);
});

it('mints a stable install id once', async () => {
  store.delete(STORAGE_KEYS.installId);
  const first = await installId();
  expect(first).toBe('installuuid');
  expect(await installId()).toBe(first);
});
