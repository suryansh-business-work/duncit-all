import { act, renderHook } from '@testing-library/react-native';

import { readDevice } from '@/services/device';
import { useSession } from '@/hooks/useSession';

// A separate file because the device read is cached for the whole process:
// once one spec has resolved it, no other spec in that module registry can see
// the failure path.
jest.mock('@/constants/config', () => ({ config: { apiUrl: 'https://api.example.test' } }));
jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
jest.mock('@/services/auth-token', () => ({ getAuthToken: jest.fn() }));
jest.mock('@/services/device', () => ({ readDevice: jest.fn() }));
jest.mock('@/services/session-guard', () => ({ endRejectedSession: jest.fn() }));

const mockReadDevice = readDevice as jest.Mock;

describe('useSession — device read fails', () => {
  it('keeps the blank device rather than throwing', async () => {
    mockReadDevice.mockRejectedValueOnce(new Error('keychain unavailable'));
    const { result } = renderHook(() => useSession());
    await act(async () => Promise.resolve());

    expect(mockReadDevice).toHaveBeenCalledTimes(1);
    expect(result.current.device).toEqual({
      duid: '',
      platform: 'unknown',
      os: '',
      model: '',
      app_version: '',
      timezone: '',
    });
    expect(result.current.status).toBe('anonymous');
  });
});
