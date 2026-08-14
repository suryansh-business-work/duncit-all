import { useEffect } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

import { fireAndForget } from '@/utils/fire-and-forget';

/** Android's own large-screen breakpoint (`sw600dp`): the width at which the
 * platform stops honouring an orientation restriction. Matching it keeps the
 * runtime lock and the platform in agreement about what "large" means. */
const LARGE_SCREEN_MIN_DP = 600;

/**
 * Holds phones to portrait, and lets tablets and unfolded foldables rotate.
 *
 * The manifest used to say `screenOrientation="portrait"`, which Play flags and
 * Android 16 ignores on large screens anyway. `withAndroidLargeScreens` drops
 * it; the phone half of that guarantee lives here, because only a runtime check
 * can tell a folded foldable (portrait) from an unfolded one (free to rotate)
 * — the same device, changing category while the app runs.
 *
 * iOS is untouched: `orientation: "portrait"` in app.json still governs there.
 */
export function useLargeScreenOrientation() {
  const { width, height } = useWindowDimensions();
  // Compare the *smaller* edge so the answer doesn't flip with the device.
  const smallestWidth = Math.min(width, height);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const lock =
      smallestWidth >= LARGE_SCREEN_MIN_DP
        ? ScreenOrientation.OrientationLock.DEFAULT
        : ScreenOrientation.OrientationLock.PORTRAIT_UP;
    fireAndForget(ScreenOrientation.lockAsync(lock));
  }, [smallestWidth]);
}
