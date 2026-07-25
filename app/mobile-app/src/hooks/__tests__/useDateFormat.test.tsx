import { renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useAppSettingsStore } from '@/stores/app-settings.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => {
  mockRequest.mockReset();
  useAppSettingsStore.getState().reset();
});

describe('useDateFormat', () => {
  it('serves the shared fallbacks, then the admin format + zone', async () => {
    mockRequest.mockResolvedValue({
      publicAppSettings: {
        date_format: 'yyyy/MM/dd',
        time_format: 'HH:mm',
        time_zone: 'UTC',
        time_source: 'SERVER',
      },
    });
    const { result } = renderHook(() => useDateFormat());
    expect(result.current.dateFormat).toBe('dd MMM yyyy');
    expect(result.current.timeZone).toBe('Asia/Kolkata');

    await waitFor(() => expect(result.current.dateFormat).toBe('yyyy/MM/dd'));
    expect(result.current.timeFormat).toBe('HH:mm');
    // Formats in the ADMIN's zone, matching mWeb rather than the device zone.
    expect(result.current.formatDate('2026-01-02T05:00:00Z')).toBe('2026/01/02');
    expect(result.current.formatTime('2026-01-02T05:00:00Z')).toBe('05:00');
  });

  it('follows the admin custom clock, so "now" is the pinned instant', async () => {
    mockRequest.mockResolvedValue({
      publicAppSettings: {
        date_format: 'yyyy-MM-dd',
        time_zone: 'UTC',
        time_source: 'CUSTOM',
        custom_time: '2030-06-15T10:00:00.000Z',
      },
    });
    const { result } = renderHook(() => useDateFormat());
    await waitFor(() => expect(result.current.dateFormat).toBe('yyyy-MM-dd'));
    expect(result.current.now().toISOString()).toBe('2030-06-15T10:00:00.000Z');
    // Today/Yesterday follow that clock, not the device's real calendar day.
    expect(result.current.dayLabel('2030-06-15T08:00:00.000Z')).toBe('Today');
    expect(result.current.dayLabel('2030-06-14T08:00:00.000Z')).toBe('Yesterday');
  });
});
