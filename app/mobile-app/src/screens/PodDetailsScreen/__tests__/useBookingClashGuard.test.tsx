import { act, renderHook, waitFor } from '@testing-library/react-native';
import { logs } from '@duncit/logs';

import { MyBookingClashesDocument } from '@/graphql/pod-booking-clash';
import { graphqlRequest } from '@/services/graphql.client';

import { useBookingClashGuard } from '../useBookingClashGuard';

jest.mock('@/services/graphql.client', () => ({
  ...jest.requireActual('@/services/graphql.client'),
  graphqlRequest: jest.fn(),
}));
const mockGraphql = graphqlRequest as jest.Mock;

const booked = {
  target_pod_id: 'target',
  pod_id: 'booked-1',
  pod_slug: 'friday-jam',
  club_slug: 'jazz-club',
  pod_title: 'Friday Jam',
  pod_date_time: '2026-11-06T13:30:00.000Z',
  pod_end_date_time: '2026-11-06T15:30:00.000Z',
};

beforeEach(() => mockGraphql.mockReset());

describe('useBookingClashGuard (native)', () => {
  it('lets the booking through without asking when nothing is being booked', async () => {
    const { result } = renderHook(() => useBookingClashGuard());
    await expect(result.current.check([])).resolves.toBe(true);
    expect(mockGraphql).not.toHaveBeenCalled();
  });

  it('asks the server about the pods being booked and lets a clash-free booking through', async () => {
    mockGraphql.mockResolvedValue({ myBookingClashes: [] });
    const { result } = renderHook(() => useBookingClashGuard());
    await expect(result.current.check(['target'])).resolves.toBe(true);
    expect(mockGraphql).toHaveBeenCalledWith(
      MyBookingClashesDocument,
      { pod_doc_ids: ['target'] },
      { auth: true },
    );
  });

  it('holds the booking until the member forces it', async () => {
    mockGraphql.mockResolvedValue({
      myBookingClashes: [booked, { ...booked, target_pod_id: 'other' }],
    });
    const { result } = renderHook(() => useBookingClashGuard());
    let decision: Promise<boolean> = Promise.resolve(false);
    act(() => {
      decision = result.current.check(['target']);
    });
    // The same booked pod against two dates is listed once.
    await waitFor(() => expect(result.current.pods.map((p) => p.pod_id)).toEqual(['booked-1']));
    act(() => result.current.answer(true));
    await expect(decision).resolves.toBe(true);
    expect(result.current.pods).toEqual([]);
  });

  it('drops the booking when the member cancels it', async () => {
    mockGraphql.mockResolvedValue({ myBookingClashes: [booked] });
    const { result } = renderHook(() => useBookingClashGuard());
    let decision: Promise<boolean> = Promise.resolve(true);
    act(() => {
      decision = result.current.check(['target']);
    });
    await waitFor(() => expect(result.current.pods).toHaveLength(1));
    act(() => result.current.answer(false));
    await expect(decision).resolves.toBe(false);
  });

  it('never blocks the booking on a check that failed, and logs why', async () => {
    const warn = jest.spyOn(logs.mobileApp, 'warn').mockImplementation(() => undefined);
    mockGraphql.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useBookingClashGuard());
    await expect(result.current.check(['target'])).resolves.toBe(true);
    expect(warn).toHaveBeenCalledWith(
      'pod-details',
      'bookingClashGuard',
      expect.objectContaining({ error: expect.any(Error) }),
    );
    warn.mockRestore();
  });

  it('ignores an answer when no question is open', () => {
    const { result } = renderHook(() => useBookingClashGuard());
    expect(() => act(() => result.current.answer(true))).not.toThrow();
  });
});
