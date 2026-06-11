import { useConfigStore } from '@/stores/config.store';
import { graphqlRequest } from '@/services/graphql.client';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockedRequest = graphqlRequest as jest.Mock;

describe('useConfigStore', () => {
  afterEach(() => jest.clearAllMocks());

  it('overrides the config with the server (Tech portal) values', async () => {
    mockedRequest.mockResolvedValue({
      publicClientConfig: { google_client_id: 'srv-id', google_maps_api_key: 'srv-key' },
    });
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().googleClientId).toBe('srv-id');
    expect(useConfigStore.getState().googleMapApiKey).toBe('srv-key');
  });

  it('keeps the fallback when the server is unreachable', async () => {
    useConfigStore.setState({ googleClientId: 'fallback-id', googleMapApiKey: 'fallback-key' });
    mockedRequest.mockRejectedValue(new Error('offline'));
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().googleClientId).toBe('fallback-id');
    expect(useConfigStore.getState().googleMapApiKey).toBe('fallback-key');
  });

  it('ignores empty/blank server values', async () => {
    useConfigStore.setState({ googleClientId: 'keep-id', googleMapApiKey: 'keep-key' });
    mockedRequest.mockResolvedValue({
      publicClientConfig: { google_client_id: '', google_maps_api_key: '   ' },
    });
    await useConfigStore.getState().load();
    expect(useConfigStore.getState().googleClientId).toBe('keep-id');
    expect(useConfigStore.getState().googleMapApiKey).toBe('keep-key');
  });
});
