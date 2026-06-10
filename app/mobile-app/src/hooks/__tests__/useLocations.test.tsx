import { renderHook } from '@testing-library/react-native';

import { useLocations } from '@/hooks/useLocations';

const mockLocState = {
  data: { locations: [{ id: 'l1', location_name: 'Mumbai', city: 'Mumbai' }] },
  isLoading: false,
  selectedId: 'l1',
  zoneName: '',
  cityLabel: 'Mumbai',
  fetch: jest.fn(),
  select: jest.fn(),
  clear: jest.fn(),
};
jest.mock('@/stores/location.store', () => ({
  useLocationStore: (selector: (s: unknown) => unknown) => selector(mockLocState),
}));

describe('useLocations', () => {
  it('exposes the locations and the active selection', () => {
    const { result } = renderHook(() => useLocations());
    expect(result.current.locations).toHaveLength(1);
    expect(result.current.selectedId).toBe('l1');
    expect(result.current.cityLabel).toBe('Mumbai');
  });
});
