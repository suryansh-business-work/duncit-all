import { act, renderHook } from '@testing-library/react-native';
import { Dimensions, Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { useLargeScreenOrientation } from '@/hooks/useLargeScreenOrientation';

const mockLock = ScreenOrientation.lockAsync as jest.Mock;

/** Drive `useWindowDimensions`, which reads `Dimensions` and re-renders on its
 * 'change' event — the same path a real fold/rotate takes. */
function setScreen(width: number, height: number) {
  Dimensions.set({ window: { width, height, scale: 1, fontScale: 1 } });
}

describe('useLargeScreenOrientation', () => {
  const originalOS = Platform.OS;
  const originalWindow = Dimensions.get('window');

  beforeEach(() => {
    mockLock.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
    // This afterEach runs before RTL's auto-cleanup, so the hook is still
    // mounted and the restore re-renders it — act() keeps that quiet.
    act(() => {
      Dimensions.set({ window: originalWindow });
    });
  });

  it('holds a phone to portrait', () => {
    setScreen(412, 915);
    renderHook(() => useLargeScreenOrientation());
    expect(mockLock).toHaveBeenCalledWith(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  });

  it('lets a tablet rotate', () => {
    setScreen(800, 1280);
    renderHook(() => useLargeScreenOrientation());
    expect(mockLock).toHaveBeenCalledWith(ScreenOrientation.OrientationLock.DEFAULT);
  });

  it('reads the smaller edge, so a tablet held sideways still counts as large', () => {
    // In landscape `width` is the LONG edge. Comparing it directly would let a
    // phone in landscape pass as a tablet.
    setScreen(1280, 800);
    renderHook(() => useLargeScreenOrientation());
    expect(mockLock).toHaveBeenCalledWith(ScreenOrientation.OrientationLock.DEFAULT);
  });

  it('unlocks when a foldable is opened past the large-screen breakpoint', () => {
    setScreen(360, 900);
    renderHook(() => useLargeScreenOrientation());
    expect(mockLock).toHaveBeenLastCalledWith(ScreenOrientation.OrientationLock.PORTRAIT_UP);

    // The same device, changing category mid-session — the reason this rule
    // cannot live in the manifest.
    act(() => setScreen(700, 900));
    expect(mockLock).toHaveBeenLastCalledWith(ScreenOrientation.OrientationLock.DEFAULT);
  });

  it('leaves iOS alone — app.json still governs orientation there', () => {
    Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
    setScreen(390, 844);
    renderHook(() => useLargeScreenOrientation());
    expect(mockLock).not.toHaveBeenCalled();
  });
});
