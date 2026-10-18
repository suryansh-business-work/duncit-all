import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { describe, expect, it, vi } from 'vitest';
import { logs } from '@duncit/logs';
import { MY_BOOKING_CLASHES, useBookingClashGuard } from '../useBookingClashGuard';

const booked = {
  __typename: 'PodBookingClash',
  target_pod_id: 'target',
  pod_id: 'booked-1',
  pod_slug: 'friday-jam',
  club_slug: 'jazz-club',
  pod_title: 'Friday Jam',
  pod_date_time: '2026-11-06T13:30:00.000Z',
  pod_end_date_time: '2026-11-06T15:30:00.000Z',
};

const answering = (result: { data: unknown } | { error: Error }) => [
  { request: { query: MY_BOOKING_CLASHES, variables: { pod_doc_ids: ['target'] } }, ...result },
];

const setup = (mocks: unknown[]) =>
  renderHook(() => useBookingClashGuard(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MockedProvider mocks={mocks as never}>{children}</MockedProvider>
    ),
  });

describe('useBookingClashGuard', () => {
  it('lets the booking through without asking when nothing is being booked', async () => {
    const { result } = setup([]);
    await expect(result.current.check([])).resolves.toBe(true);
  });

  it('lets the booking through when the member has nothing at that time', async () => {
    const { result } = setup(answering({ data: { myBookingClashes: [] } }));
    await expect(result.current.check(['target'])).resolves.toBe(true);
    expect(result.current.pods).toEqual([]);
  });

  it('holds the booking on the clash list until the member forces it', async () => {
    const { result } = setup(answering({ data: { myBookingClashes: [booked] } }));
    let decision: Promise<boolean> = Promise.resolve(false);
    act(() => {
      decision = result.current.check(['target']);
    });
    await waitFor(() => expect(result.current.pods.map((p) => p.pod_id)).toEqual(['booked-1']));
    act(() => result.current.answer(true));
    await expect(decision).resolves.toBe(true);
    expect(result.current.pods).toEqual([]);
  });

  it('drops the booking when the member cancels it', async () => {
    const { result } = setup(answering({ data: { myBookingClashes: [booked] } }));
    let decision: Promise<boolean> = Promise.resolve(true);
    act(() => {
      decision = result.current.check(['target']);
    });
    await waitFor(() => expect(result.current.pods).toHaveLength(1));
    act(() => result.current.answer(false));
    await expect(decision).resolves.toBe(false);
  });

  it('never blocks the booking on a check that failed, and logs why', async () => {
    const warn = vi.spyOn(logs.mWeb, 'warn').mockImplementation(() => undefined);
    const { result } = setup(answering({ error: new Error('offline') }));
    await expect(result.current.check(['target'])).resolves.toBe(true);
    expect(warn).toHaveBeenCalledWith('pod-details', 'bookingClashGuard', expect.objectContaining({ error: expect.anything() }));
    warn.mockRestore();
  });

  it('ignores an answer when no question is open', () => {
    const { result } = setup([]);
    expect(() => act(() => result.current.answer(true))).not.toThrow();
  });
});
