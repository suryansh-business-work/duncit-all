import { renderHook, waitFor } from '@testing-library/react-native';

import { graphqlRequest } from '@/services/graphql.client';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAppSettingsStore } from '@/stores/app-settings.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;

beforeEach(() => {
  mockRequest.mockReset();
  useAppSettingsStore.getState().reset();
});

describe('useAppSettings', () => {
  it('serves fallbacks until the server formats arrive, then the admin values', async () => {
    mockRequest.mockResolvedValue({
      publicAppSettings: { date_format: 'yyyy/MM/dd', time_format: 'HH:mm', time_zone: 'UTC' },
    });
    const { result } = renderHook(() => useAppSettings());
    expect(result.current.dateFormat).toBe('dd MMM yyyy');
    expect(result.current.timeZone).toBe('Asia/Kolkata');
    await waitFor(() => expect(result.current.dateFormat).toBe('yyyy/MM/dd'));
    expect(result.current.timeFormat).toBe('HH:mm');
    expect(result.current.timeZone).toBe('UTC');
  });

  it('keeps the fallbacks when the server returns blanks', async () => {
    mockRequest.mockResolvedValue({
      publicAppSettings: { date_format: '', time_format: '', time_zone: '' },
    });
    const { result } = renderHook(() => useAppSettings());
    await waitFor(() => expect(mockRequest).toHaveBeenCalled());
    expect(result.current.dateFormat).toBe('dd MMM yyyy');
    expect(result.current.timeFormat).toBe('hh:mm a');
    expect(result.current.timeZone).toBe('Asia/Kolkata');
  });
});
