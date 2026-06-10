import { renderHook, waitFor } from '@testing-library/react-native';

import { useBranding } from '@/hooks/useBranding';
import { graphqlRequest } from '@/services/graphql.client';
import { useBrandingStore } from '@/stores/branding.store';

jest.mock('@/services/graphql.client');
const mockedRequest = jest.mocked(graphqlRequest);

beforeEach(() => {
  jest.clearAllMocks();
  useBrandingStore.setState({ data: undefined, isLoading: false, error: undefined });
});

describe('useBranding', () => {
  it('fetches the shared branding (app name + logo) from the server', async () => {
    mockedRequest.mockResolvedValue({
      branding: {
        app_name: 'Duncit',
        logo_url: 'https://cdn.duncit.com/logo.png',
        primary_color: '#ff5757',
      },
    } as never);

    const { result } = renderHook(() => useBranding());

    await waitFor(() => expect(result.current.data?.branding.app_name).toBe('Duncit'));
    expect(mockedRequest).toHaveBeenCalledTimes(1);
  });
});
