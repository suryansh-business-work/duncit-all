import { graphqlRequest } from '@/services/graphql.client';
import { useAppVersionStore } from '@/stores/app-version.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockedRequest = graphqlRequest as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useAppVersionStore.setState({ data: undefined, isLoading: false, error: undefined });
});

describe('useAppVersionStore', () => {
  it('loads the app-version info from the server', async () => {
    mockedRequest.mockResolvedValue({
      appVersionInfo: {
        latest_version: '2.0.0',
        android_store_url: 'https://play.google.com/store/apps/details?id=com.duncit.mobile',
        ios_store_url: '',
      },
    });
    await useAppVersionStore.getState().fetch();
    expect(useAppVersionStore.getState().data?.appVersionInfo.latest_version).toBe('2.0.0');
    expect(useAppVersionStore.getState().error).toBeUndefined();
  });

  it('keeps data undefined and captures the error on failure (fail-safe, no block)', async () => {
    mockedRequest.mockRejectedValue(new Error('offline'));
    await useAppVersionStore.getState().fetch();
    expect(useAppVersionStore.getState().data).toBeUndefined();
    expect(useAppVersionStore.getState().error).toBeInstanceOf(Error);
  });

  it('accepts an empty latest_version (unset on the server)', async () => {
    mockedRequest.mockResolvedValue({
      appVersionInfo: {
        latest_version: '',
        android_store_url: 'https://play.google.com/store/apps/details?id=com.duncit.mobile',
        ios_store_url: '',
      },
    });
    await useAppVersionStore.getState().fetch();
    expect(useAppVersionStore.getState().data?.appVersionInfo.latest_version).toBe('');
  });
});
