import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStatusData } from './useStatusData';
import { fetchIncidents, fetchServices, fetchSummary } from '../api';
import type { IncidentsResponse, ServicesResponse, SummaryResponse } from '../types';

vi.mock('../api', () => ({
  fetchServices: vi.fn(),
  fetchSummary: vi.fn(),
  fetchIncidents: vi.fn(),
}));

const services = {
  generated_at: 't',
  environment: 'production',
  groups: [{ title: 'Consoles', items: [] }],
} as ServicesResponse;
const summary = { generated_at: 't', overall: {}, services: {}, global: [] } as unknown as SummaryResponse;
const incidents = { generated_at: 't', incidents: [] } as IncidentsResponse;

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useStatusData', () => {
  it('loads the catalog, summary and incidents on mount', async () => {
    vi.mocked(fetchServices).mockResolvedValue(services);
    vi.mocked(fetchSummary).mockResolvedValue(summary);
    vi.mocked(fetchIncidents).mockResolvedValue(incidents);

    const { result } = renderHook(() => useStatusData());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.groups).toEqual(services.groups));
    expect(result.current.environment).toBe('production');
    expect(result.current.summary).toEqual(summary);
    expect(result.current.incidents).toEqual([]);
    expect(result.current.lastUpdated).toBeInstanceOf(Date);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('surfaces errors and empties incidents when the requests fail', async () => {
    vi.mocked(fetchServices).mockRejectedValue(new Error('x'));
    vi.mocked(fetchSummary).mockRejectedValue(new Error('x'));
    vi.mocked(fetchIncidents).mockRejectedValue(new Error('x'));

    const { result } = renderHook(() => useStatusData());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.incidents).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('refreshes the summary and incidents on their intervals', async () => {
    vi.useFakeTimers();
    vi.mocked(fetchServices).mockResolvedValue(services);
    vi.mocked(fetchSummary).mockResolvedValue(summary);
    vi.mocked(fetchIncidents).mockResolvedValue(incidents);

    const { unmount } = renderHook(() => useStatusData());
    await vi.advanceTimersByTimeAsync(300_000);

    expect(vi.mocked(fetchServices)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fetchSummary).mock.calls.length).toBeGreaterThan(1);
    expect(vi.mocked(fetchIncidents).mock.calls.length).toBeGreaterThan(1);
    unmount();
  });

  it('ignores responses that arrive after unmount (aborted)', async () => {
    const deferred = () => {
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<never>((_, rej) => {
        reject = rej;
      });
      return { promise, reject };
    };
    const s = deferred();
    const su = deferred();
    const i = deferred();
    vi.mocked(fetchServices).mockReturnValue(s.promise);
    vi.mocked(fetchSummary).mockReturnValue(su.promise);
    vi.mocked(fetchIncidents).mockReturnValue(i.promise);

    const { result, unmount } = renderHook(() => useStatusData());
    unmount();
    s.reject(new Error('late'));
    su.reject(new Error('late'));
    i.reject(new Error('late'));
    await Promise.resolve();
    await Promise.resolve();

    // The aborted guards prevented any error state from being written.
    expect(result.current.error).toBeNull();
    expect(vi.mocked(fetchServices)).toHaveBeenCalledTimes(1);
  });
});
