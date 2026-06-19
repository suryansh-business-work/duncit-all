import { renderHook } from '@testing-library/react-native';

import { BOTTOM_NAV_BASE_HEIGHT, useBottomNavSpace } from '@/hooks/useBottomNavSpace';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 20 }),
}));

describe('useBottomNavSpace (bug 7)', () => {
  it('reserves the bar height + bottom safe-area inset + breathing gap', () => {
    expect(renderHook(() => useBottomNavSpace()).result.current).toBe(BOTTOM_NAV_BASE_HEIGHT + 36);
  });

  it('honours a custom extra gap', () => {
    expect(renderHook(() => useBottomNavSpace(0)).result.current).toBe(BOTTOM_NAV_BASE_HEIGHT + 20);
  });
});
