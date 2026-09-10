import type { ReactElement } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useScreenRefresh } from './ScreenRefreshProvider';

interface AppRefreshControlArgs {
  refreshing: boolean;
  onRefresh: () => void;
  /** iOS spinner colour — only for surfaces the brand pink disappears into
   * (the full-bleed Reels media takes `onPrimary`). Defaults to `$primary`. */
  tintColor?: string;
  testID?: string;
}

/**
 * The app's one pull-to-refresh spinner, as a hook rather than a component:
 * on Android `ScrollView`/`FlatList` clone the element they are handed and pass
 * the list itself in as children, so a wrapper component would swallow the
 * whole screen. Only a real `RefreshControl` element is safe to return.
 *
 * `tintColor` only colours the iOS spinner; Android draws a puck and reads
 * `colors` + `progressBackgroundColor`. Left at their defaults that is a dark
 * arrow on a white disc — all but invisible on the dark theme, so a pull read
 * as "nothing happened".
 */
export function useAppRefreshControl({
  refreshing,
  onRefresh,
  tintColor,
  testID,
}: AppRefreshControlArgs): ReactElement<RefreshControlProps> {
  const { primary, surface } = useThemeColors();
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tintColor ?? primary}
      colors={[primary]}
      progressBackgroundColor={surface}
      testID={testID}
    />
  );
}

/**
 * The refresh control for the screen this component sits on, or `undefined`
 * when the screen has nothing registered to reload — a scroll view given
 * `undefined` simply has no pull gesture, which is the honest answer for a
 * screen whose content never came from the server.
 */
export function useScreenRefreshControl(): ReactElement<RefreshControlProps> | undefined {
  const screen = useScreenRefresh();
  const control = useAppRefreshControl({
    refreshing: screen?.refreshing ?? false,
    onRefresh: screen?.refresh ?? (() => undefined),
    testID: 'screen-refresh',
  });
  return screen?.hasHandlers ? control : undefined;
}
