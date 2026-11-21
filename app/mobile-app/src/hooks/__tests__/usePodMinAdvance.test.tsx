import { renderHook, waitFor } from '@testing-library/react-native';

import { MyPodMinAdvanceDaysDocument } from '@/graphql/pod-min-advance';
import { usePodMinAdvance } from '@/hooks/usePodMinAdvance';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    dayKey: () => '2026-11-10',
    timeZone: 'Asia/Kolkata',
    clock: { nowMs: () => Date.parse('2026-11-10T08:30:00.000Z') },
  }),
}));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => mockRequest.mockReset());

describe('usePodMinAdvance', () => {
  it('reads the host’s days and opens on the day that many days from today, at local midnight', async () => {
    mockRequest.mockResolvedValue({ myPodMinAdvanceDays: 5 });
    const { result } = renderHook(() => usePodMinAdvance());
    expect(result.current).toBeNull();
    await waitFor(() =>
      expect(result.current).toEqual({
        days: 5,
        day: '2026-11-15',
        startMs: Date.parse('2026-11-14T18:30:00.000Z'),
      }),
    );
    expect(mockRequest).toHaveBeenCalledWith(MyPodMinAdvanceDaysDocument, {}, { auth: true });
  });

  it('asks nothing and stays null when switched off (a Club Admin’s pod)', () => {
    const { result } = renderHook(() => usePodMinAdvance(false));
    expect(mockRequest).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it('stays null when the read fails or answers without a number', async () => {
    mockRequest.mockRejectedValueOnce(new Error('offline'));
    const failed = renderHook(() => usePodMinAdvance());
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
    expect(failed.result.current).toBeNull();

    mockRequest.mockResolvedValueOnce({});
    const empty = renderHook(() => usePodMinAdvance());
    await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
    expect(empty.result.current).toBeNull();
  });
});
