import { act, renderHook } from '@testing-library/react-native';

import { useEffectiveScheme, useSchemeLocked } from '@/hooks/useEffectiveScheme';
import { useOccasionStore, type OccasionLiveData } from '@/stores/occasion.store';
import { useThemeStore } from '@/stores/theme.store';

/** A live answer whose look pins `color_mode` (or no look at all). */
function liveWith(colorMode: 'AUTO' | 'LIGHT' | 'DARK' | null) {
  const theme = colorMode === null ? null : { color_mode: colorMode };
  act(() => {
    useOccasionStore.setState({ data: { occasionLive: { theme } } as unknown as OccasionLiveData });
  });
}

beforeEach(() => {
  act(() => {
    useOccasionStore.setState({ data: undefined });
    useThemeStore.setState({ scheme: 'light' });
  });
});

describe('useEffectiveScheme', () => {
  it("is the viewer's mode before the look loads and when no look is live", () => {
    const { result, rerender } = renderHook(() => useEffectiveScheme());
    expect(result.current).toBe('light');

    liveWith(null);
    act(() => useThemeStore.setState({ scheme: 'dark' }));
    rerender({});
    expect(result.current).toBe('dark');
  });

  it("keeps the viewer's mode for a look that leaves the mode to them", () => {
    liveWith('AUTO');
    const { result } = renderHook(() => useEffectiveScheme());
    expect(result.current).toBe('light');
  });

  it('wears the mode a look pins, whatever the viewer chose', () => {
    liveWith('DARK');
    const { result } = renderHook(() => useEffectiveScheme());
    expect(result.current).toBe('dark');

    liveWith('LIGHT');
    act(() => useThemeStore.setState({ scheme: 'dark' }));
    expect(renderHook(() => useEffectiveScheme()).result.current).toBe('light');
  });
});

describe('useSchemeLocked', () => {
  it('locks the light/dark controls only while a look pins the mode', () => {
    expect(renderHook(() => useSchemeLocked()).result.current).toBe(false);
    liveWith('AUTO');
    expect(renderHook(() => useSchemeLocked()).result.current).toBe(false);
    liveWith('DARK');
    expect(renderHook(() => useSchemeLocked()).result.current).toBe(true);
    liveWith('LIGHT');
    expect(renderHook(() => useSchemeLocked()).result.current).toBe(true);
  });
});
