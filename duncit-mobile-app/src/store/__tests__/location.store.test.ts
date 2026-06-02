import { act, renderHook } from '@testing-library/react-native';

import { useLocationStore } from '@/store/location.store';

describe('useLocationStore', () => {
  it('starts in the undetermined state', () => {
    const { result } = renderHook(() => useLocationStore());
    expect(result.current.permission).toBe('undetermined');
    expect(result.current.coordinates).toBeNull();
  });

  it('sets location, updates permission and resets', () => {
    const { result } = renderHook(() => useLocationStore());

    act(() => result.current.setLocation('granted', { latitude: 1, longitude: 2 }));
    expect(result.current.permission).toBe('granted');
    expect(result.current.coordinates).toEqual({ latitude: 1, longitude: 2 });

    act(() => result.current.setPermission('denied'));
    expect(result.current.permission).toBe('denied');
    expect(result.current.coordinates).toEqual({ latitude: 1, longitude: 2 });

    act(() => result.current.reset());
    expect(result.current.permission).toBe('undetermined');
    expect(result.current.coordinates).toBeNull();
  });
});
