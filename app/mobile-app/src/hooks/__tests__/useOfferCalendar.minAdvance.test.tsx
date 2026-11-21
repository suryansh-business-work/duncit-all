import { renderHook, waitFor } from '@testing-library/react-native';

import { useOfferCalendar } from '@/hooks/useOfferCalendar';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * The venue offer calendar starts on the host's first allowed day (Minimum
 * Advance Days), so every earlier day has no start time and is disabled.
 */
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/components/PullToRefresh', () => ({ useRefreshRegistration: () => undefined }));
jest.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => ({
    dayKey: () => '2026-11-10',
    timeZone: 'Asia/Kolkata',
    clock: { nowMs: () => Date.parse('2026-11-10T08:30:00.000Z') },
  }),
}));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => {
  mockRequest.mockReset();
  mockRequest.mockResolvedValue({
    venueOfferCalendar: { buffer_minutes: 0, min_notice_minutes: 0, days: [] },
  });
});

const variablesOfLastRead = () => mockRequest.mock.calls.at(-1)?.[1];

describe('useOfferCalendar — first allowed day', () => {
  it('reads 62 days from the first allowed day when it is after today', async () => {
    renderHook(() => useOfferCalendar('v1', 'Whole venue', '2026-11-15'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(variablesOfLastRead()).toMatchObject({
      venue_id: 'v1',
      from: '2026-11-15',
      to: '2027-01-15',
    });
  });

  it('reads from today with no first day (a Club Admin, or the rule not known yet)', async () => {
    renderHook(() => useOfferCalendar('v1', 'Whole venue'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(variablesOfLastRead()).toMatchObject({ from: '2026-11-10', to: '2027-01-10' });
  });

  it('never starts before today, whatever day it is handed', async () => {
    renderHook(() => useOfferCalendar('v1', 'Whole venue', '2026-11-01'));
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(variablesOfLastRead()).toMatchObject({ from: '2026-11-10' });
  });
});
