import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { logs } from '@duncit/logs';
import { ops, resetOps } from '../mocks/ops';

const client = vi.hoisted(() => ({
  writeQuery: vi.fn(),
  cache: { evict: vi.fn(), gc: vi.fn() },
}));

vi.mock('@apollo/client/react', async (io) => ({
  ...(await (await import('../mocks/ops')).apolloOpsFactory(io)),
  useApolloClient: () => client,
}));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));

import { useEnvAccess } from '../../src/pages/environment/access-gate/useEnvAccess';

const locked = { __typename: 'EnvAccessStatus', unlocked: false, expires_at: null, sent_to: 'root@example.test' };
const unlockedUntil = (at: string) => ({ ...locked, unlocked: true, expires_at: at, sent_to: null });

const SECRET_FIELDS = [
  'envEntries',
  'envEntriesTable',
  'envEntry',
  'envEntriesForPortal',
  'envOverview',
  'envTestHistory',
  'envTestAttempts',
];

let errorLog: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetOps();
  client.writeQuery.mockReset();
  client.cache.evict.mockReset();
  client.cache.gc.mockReset();
  errorLog = vi.spyOn(logs.portal.tech, 'error').mockImplementation(() => undefined);
  ops.q = { EnvAccessStatus: { data: { envAccessStatus: locked } } };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useEnvAccess / status', () => {
  it('reads a locked session and offers nothing pending', () => {
    const { result } = renderHook(() => useEnvAccess());

    expect(result.current.access).toEqual(locked);
    expect(result.current.loading).toBe(false);
    expect(result.current.pending).toBeNull();
  });

  it('is loading only until the first answer, not on a refetch behind stale data', () => {
    ops.q = { EnvAccessStatus: { loading: true } };
    expect(renderHook(() => useEnvAccess()).result.current.loading).toBe(true);

    ops.q = { EnvAccessStatus: { loading: true, data: { envAccessStatus: locked } } };
    expect(renderHook(() => useEnvAccess()).result.current.loading).toBe(false);
  });

  it('passes the status error through', () => {
    const error = new Error('status unavailable');
    ops.q = { EnvAccessStatus: { error } };
    expect(renderHook(() => useEnvAccess()).result.current.error).toBe(error);
  });

  it('retries the status read, and logs a retry that fails', async () => {
    const refetch = vi.fn().mockRejectedValue(new Error('still down'));
    ops.q = { EnvAccessStatus: { error: new Error('down'), refetch } };
    const { result } = renderHook(() => useEnvAccess());

    act(() => result.current.retry());

    await waitFor(() =>
      expect(errorLog).toHaveBeenCalledWith('envAccess', 'retry', { msg: 'status refetch failed', reason: 'still down' }),
    );
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe('useEnvAccess / sending and verifying the code', () => {
  const issued = {
    __typename: 'EnvAccessCodeRequest',
    challenge_id: 'ch-1',
    expires_at: '2026-10-20T10:10:00.000Z',
    resend_after_seconds: 30,
    sent_to: 'root@example.test',
  };

  it('holds the issued challenge, with a resend allowed after the server wait, and says where it went', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    ops.mut.RequestEnvAccessCode = vi.fn().mockResolvedValue({ data: { requestEnvAccessCode: issued } });
    const { result } = renderHook(() => useEnvAccess());

    await act(() => result.current.send());

    expect(result.current.pending).toEqual({
      challengeId: 'ch-1',
      expiresAt: '2026-10-20T10:10:00.000Z',
      sentTo: 'root@example.test',
      resendAt: 1_030_000,
    });
    expect(ops.notifySuccess).toHaveBeenCalledWith('Code sent to root@example.test');
  });

  it('keeps nothing pending when the server answers without a challenge', async () => {
    ops.mut.RequestEnvAccessCode = vi.fn().mockResolvedValue({ data: undefined });
    const { result } = renderHook(() => useEnvAccess());

    await act(() => result.current.send());

    expect(result.current.pending).toBeNull();
    expect(ops.notifySuccess).not.toHaveBeenCalled();
  });

  it('reports a refused code request', async () => {
    ops.mut.RequestEnvAccessCode = vi.fn().mockRejectedValue(new Error('Too many codes'));
    const { result } = renderHook(() => useEnvAccess());

    await act(() => result.current.send());

    expect(ops.notifyError).toHaveBeenCalledWith('Too many codes');
    expect(result.current.pending).toBeNull();
  });

  it('ignores a verify with no code requested first', async () => {
    const verify = vi.fn();
    ops.mut.VerifyEnvAccessCode = verify;
    const { result } = renderHook(() => useEnvAccess());

    await act(() => result.current.verify('123456'));

    expect(verify).not.toHaveBeenCalled();
  });

  it('verifies against the issued challenge, clears it and writes the unlocked status', async () => {
    const unlocked = unlockedUntil('2026-10-20T11:00:00.000Z');
    ops.mut.RequestEnvAccessCode = vi.fn().mockResolvedValue({ data: { requestEnvAccessCode: issued } });
    ops.mut.VerifyEnvAccessCode = vi.fn().mockResolvedValue({ data: { verifyEnvAccessCode: unlocked } });
    const { result } = renderHook(() => useEnvAccess());
    await act(() => result.current.send());

    await act(() => result.current.verify('123456'));

    expect(ops.mut.VerifyEnvAccessCode).toHaveBeenCalledWith({ variables: { challengeId: 'ch-1', code: '123456' } });
    expect(result.current.pending).toBeNull();
    expect(client.writeQuery).toHaveBeenCalledWith(expect.objectContaining({ data: { envAccessStatus: unlocked } }));
    // Still unlocked: nothing the session fetched is dropped.
    expect(client.cache.evict).not.toHaveBeenCalled();
  });

  it('keeps the challenge when the server answers a verify with nothing', async () => {
    ops.mut.RequestEnvAccessCode = vi.fn().mockResolvedValue({ data: { requestEnvAccessCode: issued } });
    ops.mut.VerifyEnvAccessCode = vi.fn().mockResolvedValue({ data: undefined });
    const { result } = renderHook(() => useEnvAccess());
    await act(() => result.current.send());

    await act(() => result.current.verify('123456'));

    expect(result.current.pending).not.toBeNull();
    expect(client.writeQuery).not.toHaveBeenCalled();
  });

  it('reports a wrong code and keeps the challenge for another try', async () => {
    ops.mut.RequestEnvAccessCode = vi.fn().mockResolvedValue({ data: { requestEnvAccessCode: issued } });
    ops.mut.VerifyEnvAccessCode = vi.fn().mockRejectedValue(new Error('Wrong code'));
    const { result } = renderHook(() => useEnvAccess());
    await act(() => result.current.send());

    await act(() => result.current.verify('000000'));

    expect(ops.notifyError).toHaveBeenCalledWith('Wrong code');
    expect(result.current.pending?.challengeId).toBe('ch-1');
  });
});

describe('useEnvAccess / locking', () => {
  it('locks the session, drops every secret field from the cache and confirms', async () => {
    ops.mut.LockEnvAccess = vi.fn().mockResolvedValue({ data: { lockEnvAccess: locked } });
    const { result } = renderHook(() => useEnvAccess());

    await act(() => result.current.lock());

    expect(client.writeQuery).toHaveBeenCalledWith(expect.objectContaining({ data: { envAccessStatus: locked } }));
    expect(client.cache.evict.mock.calls.map(([arg]) => arg)).toEqual(
      SECRET_FIELDS.map((fieldName) => ({ id: 'ROOT_QUERY', fieldName })),
    );
    expect(client.cache.gc).toHaveBeenCalledTimes(1);
    expect(ops.notifySuccess).toHaveBeenCalledWith('Environment Variables are locked');
  });

  it('still confirms when the server answered a lock with nothing, and changes no cache', async () => {
    ops.mut.LockEnvAccess = vi.fn().mockResolvedValue({ data: undefined });
    const { result } = renderHook(() => useEnvAccess());

    await act(() => result.current.lock());

    expect(client.writeQuery).not.toHaveBeenCalled();
    expect(ops.notifySuccess).toHaveBeenCalledTimes(1);
  });

  it('reports a failed lock', async () => {
    ops.mut.LockEnvAccess = vi.fn().mockRejectedValue(new Error('Could not lock'));
    const { result } = renderHook(() => useEnvAccess());

    await act(() => result.current.lock());

    expect(ops.notifyError).toHaveBeenCalledWith('Could not lock');
    expect(ops.notifySuccess).not.toHaveBeenCalled();
  });
});

describe('useEnvAccess / the server ending the unlock', () => {
  const NOW = new Date('2026-10-20T10:00:00.000Z');

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
    vi.setSystemTime(NOW);
  });

  it('re-reads the status when the unlock expires, and applies a locked answer', async () => {
    const refetch = vi.fn().mockResolvedValue({ data: { envAccessStatus: locked } });
    ops.q = { EnvAccessStatus: { data: { envAccessStatus: unlockedUntil('2026-10-20T10:00:05.000Z') }, refetch } };
    renderHook(() => useEnvAccess());

    await act(() => vi.advanceTimersByTimeAsync(4_999));
    expect(refetch).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(client.writeQuery).toHaveBeenCalledWith(expect.objectContaining({ data: { envAccessStatus: locked } }));
    expect(client.cache.evict).toHaveBeenCalledTimes(SECRET_FIELDS.length);
  });

  it('re-reads at once for an unlock already past its end', async () => {
    const refetch = vi.fn().mockResolvedValue({ data: { envAccessStatus: locked } });
    ops.q = { EnvAccessStatus: { data: { envAccessStatus: unlockedUntil('2026-10-20T09:00:00.000Z') }, refetch } };
    renderHook(() => useEnvAccess());

    await act(() => vi.advanceTimersByTimeAsync(0));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('changes nothing when that re-read comes back empty', async () => {
    const refetch = vi.fn().mockResolvedValue({ data: undefined });
    ops.q = { EnvAccessStatus: { data: { envAccessStatus: unlockedUntil('2026-10-20T10:00:01.000Z') }, refetch } };
    renderHook(() => useEnvAccess());

    await act(() => vi.advanceTimersByTimeAsync(1_000));

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(client.writeQuery).not.toHaveBeenCalled();
  });

  it('logs a re-read that fails', async () => {
    const refetch = vi.fn().mockRejectedValue(new Error('offline'));
    ops.q = { EnvAccessStatus: { data: { envAccessStatus: unlockedUntil('2026-10-20T10:00:01.000Z') }, refetch } };
    renderHook(() => useEnvAccess());

    await act(() => vi.advanceTimersByTimeAsync(1_000));

    expect(errorLog).toHaveBeenCalledWith('envAccess', 'relock', { msg: 'status refetch failed', reason: 'offline' });
  });

  it('sets no timer for a locked session or one with no end time, and clears it on unmount', async () => {
    const refetch = vi.fn().mockResolvedValue({ data: { envAccessStatus: locked } });
    ops.q = { EnvAccessStatus: { data: { envAccessStatus: { ...unlockedUntil('x'), expires_at: null } }, refetch } };
    renderHook(() => useEnvAccess());
    ops.q = { EnvAccessStatus: { data: { envAccessStatus: locked }, refetch } };
    renderHook(() => useEnvAccess());
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(refetch).not.toHaveBeenCalled();

    ops.q = { EnvAccessStatus: { data: { envAccessStatus: unlockedUntil('2026-10-20T10:00:30.000Z') }, refetch } };
    const { unmount } = renderHook(() => useEnvAccess());
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(refetch).not.toHaveBeenCalled();
  });
});
