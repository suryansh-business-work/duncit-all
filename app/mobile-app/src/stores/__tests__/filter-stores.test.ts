import { graphqlRequest } from '@/services/graphql.client';
import { useLocationStore } from '@/stores/location.store';
import { useSuperCategoryStore } from '@/stores/super-category.store';

jest.mock('@/services/graphql.client', () => ({ graphqlRequest: jest.fn() }));
const mockRequest = graphqlRequest as jest.Mock;
beforeEach(() => mockRequest.mockReset());

describe('super-category store', () => {
  it('fetches, selects, and skips when cached', async () => {
    useSuperCategoryStore.setState({ data: undefined, isLoading: false, selectedSlug: '' });
    mockRequest.mockResolvedValueOnce({
      categories: [{ id: 's1', name: 'Music', slug: 'music', icon: null }],
    });
    await useSuperCategoryStore.getState().fetch();
    expect(useSuperCategoryStore.getState().data?.categories).toHaveLength(1);

    useSuperCategoryStore.getState().select('music');
    expect(useSuperCategoryStore.getState().selectedSlug).toBe('music');

    await useSuperCategoryStore.getState().fetch(); // cached → no second call
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('captures errors', async () => {
    useSuperCategoryStore.setState({ data: undefined, isLoading: false });
    mockRequest.mockRejectedValueOnce(new Error('x'));
    await useSuperCategoryStore.getState().fetch();
    expect(useSuperCategoryStore.getState().error).toBeDefined();
  });
});

describe('location store', () => {
  it('fetches, selects with a zone, and clears', async () => {
    useLocationStore.setState({
      data: undefined,
      isLoading: false,
      selectedId: '',
      zoneName: '',
      cityLabel: '',
    });
    mockRequest.mockResolvedValueOnce({
      locations: [
        {
          id: 'l1',
          location_name: 'Mumbai',
          city: 'Mumbai',
          state: 'MH',
          location_image: '',
          location_zones: [],
        },
      ],
    });
    await useLocationStore.getState().fetch();
    expect(useLocationStore.getState().data?.locations).toHaveLength(1);

    mockRequest.mockResolvedValueOnce({});
    useLocationStore
      .getState()
      .select({ id: 'l1', city: 'Mumbai', location_name: 'Mumbai' } as never, 'Z1');
    expect(useLocationStore.getState().selectedId).toBe('l1');
    expect(useLocationStore.getState().cityLabel).toBe('Mumbai');
    expect(useLocationStore.getState().zoneName).toBe('Z1');
    // An explicit pick persists the choice to the server.
    await Promise.resolve();
    expect(mockRequest).toHaveBeenLastCalledWith(
      expect.anything(),
      { locationId: 'l1' },
      { auth: true },
    );

    // city empty → falls back to location_name; persist disabled → no request.
    mockRequest.mockClear();
    useLocationStore
      .getState()
      .select({ id: 'l2', city: '', location_name: 'Pune' } as never, '', false);
    expect(useLocationStore.getState().cityLabel).toBe('Pune');
    await Promise.resolve();
    expect(mockRequest).not.toHaveBeenCalled();

    useLocationStore.getState().clear();
    expect(useLocationStore.getState().selectedId).toBe('');
    expect(useLocationStore.getState().cityLabel).toBe('');
  });

  it('keeps the local selection even if persisting it fails', async () => {
    mockRequest.mockRejectedValueOnce(new Error('offline'));
    useLocationStore
      .getState()
      .select({ id: 'l9', city: 'Delhi', location_name: 'Delhi' } as never);
    await Promise.resolve();
    await Promise.resolve();
    expect(useLocationStore.getState().selectedId).toBe('l9');
  });

  it('hydrates a saved location only when nothing is selected', async () => {
    const loc = { id: 'l1', city: 'Mumbai', location_name: 'Mumbai' };
    useLocationStore.setState({
      data: { locations: [loc] } as never,
      selectedId: '',
      cityLabel: '',
    });

    // No saved id, or unknown id → no-op.
    useLocationStore.getState().hydrateFromUser(null);
    useLocationStore.getState().hydrateFromUser('nope');
    expect(useLocationStore.getState().selectedId).toBe('');

    // Locations not loaded yet → no-op even with a saved id.
    useLocationStore.setState({ data: undefined });
    useLocationStore.getState().hydrateFromUser('l1');
    expect(useLocationStore.getState().selectedId).toBe('');
    useLocationStore.setState({ data: { locations: [loc] } as never });

    // A saved id present in the loaded list selects it without re-persisting.
    mockRequest.mockClear();
    useLocationStore.getState().hydrateFromUser('l1');
    expect(useLocationStore.getState().selectedId).toBe('l1');
    await Promise.resolve();
    expect(mockRequest).not.toHaveBeenCalled();

    // Already selected → hydration is ignored.
    useLocationStore.getState().hydrateFromUser('l1');
    expect(useLocationStore.getState().selectedId).toBe('l1');
  });

  it('captures fetch errors', async () => {
    useLocationStore.setState({ data: undefined, isLoading: false });
    mockRequest.mockRejectedValueOnce(new Error('x'));
    await useLocationStore.getState().fetch();
    expect(useLocationStore.getState().error).toBeDefined();
  });
});
