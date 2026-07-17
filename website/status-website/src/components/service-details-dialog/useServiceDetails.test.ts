import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useServiceDetails } from './useServiceDetails';
import { fetchHealth, fetchHistory, fetchProbe } from '../../api';
import type { HealthReport, HistoryResponse, ProbeResult, StatusService } from '../../types';

vi.mock('../../api', () => ({
  fetchProbe: vi.fn(),
  fetchHealth: vi.fn(),
  fetchHistory: vi.fn(),
}));

const probe = { url: 'https://a.test', ok: true, statusCode: 200, statusText: 'OK', ssl: null } as ProbeResult;
const history = { service: 'api', daily: [], points: [] } as HistoryResponse;
const health = { status: 'ok' } as HealthReport;

const withHealth: StatusService = {
  key: 'api',
  name: 'API',
  url: 'https://a.test',
  description: 'Core API',
  health: 'https://a.test/health',
};
const noHealth: StatusService = { ...withHealth, health: undefined };

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('useServiceDetails', () => {
  it('stays empty and issues no requests when there is no service', () => {
    const { result } = renderHook(() => useServiceDetails(null));
    expect(result.current.probe).toBeNull();
    expect(fetchProbe).not.toHaveBeenCalled();
  });

  it('loads probe and history but skips health when the service has none', async () => {
    vi.mocked(fetchProbe).mockResolvedValue(probe);
    vi.mocked(fetchHistory).mockResolvedValue(history);

    const { result } = renderHook(() => useServiceDetails(noHealth));

    await waitFor(() => expect(result.current.probe).toEqual(probe));
    expect(result.current.history).toEqual(history);
    expect(result.current.health).toBeNull();
    expect(fetchHealth).not.toHaveBeenCalled();
  });

  it('loads the health report when the service exposes one', async () => {
    vi.mocked(fetchProbe).mockResolvedValue(probe);
    vi.mocked(fetchHistory).mockResolvedValue(history);
    vi.mocked(fetchHealth).mockResolvedValue(health);

    const { result } = renderHook(() => useServiceDetails(withHealth));
    await waitFor(() => expect(result.current.health).toEqual(health));
  });

  it('records errors from each request while mounted', async () => {
    vi.mocked(fetchProbe).mockRejectedValue(new Error('probe failed'));
    vi.mocked(fetchHealth).mockRejectedValue(new Error('health failed'));
    vi.mocked(fetchHistory).mockRejectedValue(new Error('history failed'));

    const { result } = renderHook(() => useServiceDetails(withHealth));
    await waitFor(() => expect(result.current.probeError).toBe('probe failed'));
    expect(result.current.healthError).toBe(true);
    expect(result.current.historyError).toBe(true);
  });

  it('uses a generic message when the probe rejects with a non-Error', async () => {
    vi.mocked(fetchProbe).mockRejectedValue('nope');
    vi.mocked(fetchHistory).mockResolvedValue(history);

    const { result } = renderHook(() => useServiceDetails(noHealth));
    await waitFor(() => expect(result.current.probeError).toBe('Could not load details'));
  });

  it('ignores rejections that arrive after the dialog closes (aborted)', async () => {
    const deferred = () => {
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<never>((_, rej) => {
        reject = rej;
      });
      return { promise, reject };
    };
    const p = deferred();
    const h = deferred();
    const hi = deferred();
    vi.mocked(fetchProbe).mockReturnValue(p.promise);
    vi.mocked(fetchHealth).mockReturnValue(h.promise);
    vi.mocked(fetchHistory).mockReturnValue(hi.promise);

    const { result, unmount } = renderHook(() => useServiceDetails(withHealth));
    unmount();

    await act(async () => {
      p.reject(new Error('late'));
      h.reject(new Error('late'));
      hi.reject(new Error('late'));
      await Promise.resolve();
    });

    // No state was written after abort.
    expect(result.current.probeError).toBeNull();
    expect(result.current.healthError).toBe(false);
    expect(result.current.historyError).toBe(false);
  });
});
