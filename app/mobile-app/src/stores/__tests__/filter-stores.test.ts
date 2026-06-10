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

    useLocationStore
      .getState()
      .select({ id: 'l1', city: 'Mumbai', location_name: 'Mumbai' } as never, 'Z1');
    expect(useLocationStore.getState().selectedId).toBe('l1');
    expect(useLocationStore.getState().cityLabel).toBe('Mumbai');
    expect(useLocationStore.getState().zoneName).toBe('Z1');

    // city empty → falls back to location_name
    useLocationStore.getState().select({ id: 'l2', city: '', location_name: 'Pune' } as never);
    expect(useLocationStore.getState().cityLabel).toBe('Pune');

    useLocationStore.getState().clear();
    expect(useLocationStore.getState().selectedId).toBe('');
    expect(useLocationStore.getState().cityLabel).toBe('');
  });

  it('captures fetch errors', async () => {
    useLocationStore.setState({ data: undefined, isLoading: false });
    mockRequest.mockRejectedValueOnce(new Error('x'));
    await useLocationStore.getState().fetch();
    expect(useLocationStore.getState().error).toBeDefined();
  });
});
