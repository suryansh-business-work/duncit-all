import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { renderHook, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { syncDeviceCalls } from '@/services/call-sync';
import { isDirectoryStale, readDirectoryStatus, syncDirectory } from '@/services/directory-sync';
import { gqlRequest } from '@/services/graphql.client';
import { clearToken, resetTokenCache, setToken } from '@/services/session';
import { useAuthStore } from '@/stores/auth.store';
import { useFeaturesStore } from '@/stores/features.store';
import { useAppSession } from '@/hooks/useAppSession';
import {
  BACKGROUND_SYNC_TASK,
  defineBackgroundSync,
  registerBackgroundSync,
  runSync,
  unregisterBackgroundSync,
} from '../background-sync';
import { uploadFile } from '../upload';

jest.mock('crm-telephony', () => ({
  CrmTelephony: { takePendingPostCall: jest.fn(() => null), setFeatures: jest.fn() },
}));
jest.mock('@/services/call-sync', () => ({ syncDeviceCalls: jest.fn() }));
jest.mock('@/services/directory-sync', () => ({
  isDirectoryStale: jest.fn(),
  readDirectoryStatus: jest.fn(),
  syncDirectory: jest.fn(),
}));
jest.mock('@/services/graphql.client', () => ({ gqlRequest: jest.fn() }));

const jwt = (psv: object) => `h.${Buffer.from(JSON.stringify({ psv })).toString('base64url')}.s`;

beforeEach(async () => {
  jest.clearAllMocks();
  resetTokenCache();
  useFeaturesStore.setState({ hydrated: true });
  (readDirectoryStatus as jest.Mock).mockResolvedValue({ syncedAt: null, count: 0 });
  (syncDeviceCalls as jest.Mock).mockResolvedValue({ failed: false });
});

describe('runSync', () => {
  it('does nothing signed out or before Security Verification', async () => {
    await expect(runSync()).resolves.toBe(false);
    await setToken(jwt({ portal: 'crm', verified: false }));
    await expect(runSync()).resolves.toBe(false);
    expect(syncDeviceCalls).not.toHaveBeenCalled();
  });

  it('refreshes a stale directory first, then sends calls', async () => {
    await setToken(jwt({ portal: 'crm', verified: true }));
    (isDirectoryStale as jest.Mock).mockReturnValue(true);
    await expect(runSync()).resolves.toBe(true);
    expect(syncDirectory).toHaveBeenCalled();
    expect(syncDeviceCalls).toHaveBeenCalled();
  });

  it('never throws: a failed run is retried later', async () => {
    await setToken(jwt({ portal: 'crm', verified: true }));
    (isDirectoryStale as jest.Mock).mockReturnValue(false);
    (syncDeviceCalls as jest.Mock).mockRejectedValue(new Error('offline'));
    await expect(runSync()).resolves.toBe(false);
  });
});

describe('background task', () => {
  it('defines the task, reporting success or failure to Android', async () => {
    defineBackgroundSync();
    const [name, body] = (TaskManager.defineTask as jest.Mock).mock.calls[0];
    expect(name).toBe(BACKGROUND_SYNC_TASK);
    await clearToken();
    await expect(body()).resolves.toBe(BackgroundTask.BackgroundTaskResult.Failed);
    await setToken(jwt({ portal: 'crm', verified: true }));
    (isDirectoryStale as jest.Mock).mockReturnValue(false);
    await expect(body()).resolves.toBe(BackgroundTask.BackgroundTaskResult.Success);
  });

  it('schedules every 15 minutes and unschedules only a registered task', async () => {
    await registerBackgroundSync();
    expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15,
    });
    await unregisterBackgroundSync();
    expect(BackgroundTask.unregisterTaskAsync).not.toHaveBeenCalled();
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValueOnce(true);
    await unregisterBackgroundSync();
    expect(BackgroundTask.unregisterTaskAsync).toHaveBeenCalledWith(BACKGROUND_SYNC_TASK);
  });
});

describe('uploadFile', () => {
  afterEach(() => jest.restoreAllMocks());

  it('gets a ticket, posts the file to /upload and answers its URL', async () => {
    (gqlRequest as jest.Mock).mockResolvedValue({
      getImagekitAuth: { uploadUrl: 'https://server/upload', ticket: 't 1' },
    });
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ ok: true, json: async () => ({ url: 'https://ik/x.m4a' }) } as Response);
    await expect(
      uploadFile({ uri: 'file:///a.m4a', name: 'a b.m4a', type: 'audio/mp4' }, 'call-recordings'),
    ).resolves.toBe('https://ik/x.m4a');
    expect((gqlRequest as jest.Mock).mock.calls[0][1]).toEqual({
      folder: 'call-recordings',
      surface: 'MOBILE',
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://server/upload?ticket=t%201&fileName=a%20b.m4a',
    );
  });

  it('fails loudly on a refused upload or a missing URL', async () => {
    (gqlRequest as jest.Mock).mockResolvedValue({
      getImagekitAuth: { uploadUrl: 'https://server/upload', ticket: 't' },
    });
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: false, status: 413 } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) } as Response);
    await expect(uploadFile({ uri: 'f', name: 'n', type: 'audio/mp4' }, 'x')).rejects.toThrow(
      'HTTP 413',
    );
    await expect(uploadFile({ uri: 'f', name: 'n', type: 'audio/mp4' }, 'x')).rejects.toThrow(
      'without a file URL',
    );
  });
});

describe('useAppSession', () => {
  it('restores the session on launch and, once signed in, syncs whenever the app comes to the front', async () => {
    const bootstrap = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState({ status: 'loading', bootstrap });
    const listeners: ((s: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_e, fn) => {
      listeners.push(fn as (s: string) => void);
      return { remove: jest.fn() } as never;
    });
    (gqlRequest as jest.Mock).mockResolvedValue({ publicLocales: [], publicTranslations: [] });
    const { rerender } = renderHook(() => useAppSession());
    expect(bootstrap).toHaveBeenCalled();
    await setToken(jwt({ portal: 'crm', verified: true }));
    useAuthStore.setState({ status: 'signedIn' });
    rerender({});
    await waitFor(() => expect(BackgroundTask.registerTaskAsync).toHaveBeenCalled());
    listeners.forEach((fn) => fn('active'));
    await waitFor(() => expect(syncDeviceCalls).toHaveBeenCalledTimes(2));
  });
});
