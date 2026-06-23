import { renderHook } from '@testing-library/react-native';

import { useLocations } from '@/hooks/useLocations';

const hydrateFromUser = jest.fn();
const mockLocState = {
  data: { locations: [{ id: 'l1', location_name: 'Mumbai', city: 'Mumbai' }] },
  isLoading: false,
  selectedId: 'l1',
  zoneName: '',
  cityLabel: 'Mumbai',
  fetch: jest.fn(),
  select: jest.fn(),
  clear: jest.fn(),
  hydrateFromUser,
};
jest.mock('@/stores/location.store', () => ({
  useLocationStore: (selector: (s: unknown) => unknown) => selector(mockLocState),
}));

const meState = { data: { me: { selected_location_id: 'l1' } } };
jest.mock('@/stores/me.store', () => ({
  useMeStore: (selector: (s: unknown) => unknown) => selector(meState),
}));

describe('useLocations', () => {
  it('exposes the locations and the active selection', () => {
    const { result } = renderHook(() => useLocations());
    expect(result.current.locations).toHaveLength(1);
    expect(result.current.selectedId).toBe('l1');
    expect(result.current.cityLabel).toBe('Mumbai');
  });

  it('hydrates the saved location from the signed-in user', () => {
    renderHook(() => useLocations());
    expect(hydrateFromUser).toHaveBeenCalledWith('l1');
  });
});
