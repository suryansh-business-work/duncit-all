import type { ReactElement } from 'react';
import { Platform, RefreshControl, type RefreshControlProps } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useScreenRefresh } from './ScreenRefreshProvider';

interface AppRefreshControlArgs {
  refreshing: boolean;
  onRefresh: () => void;
  /** iOS spinner colour — only for surfaces the brand pink disappears into
   * (the full-bleed Reels media takes `onPrimary`). Defaults to `$primary`. */
  tintColor?: string;
  /** Android only: iOS has no switch for the gesture short of removing the control. */
  enabled?: boolean;
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
  enabled,
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
      enabled={enabled}
      testID={testID}
    />
  );
}

/**
 * The refresh control for the screen this component sits on.
 *
 * Whether a scroll view HAS a control must never change over its life: React
 * Native renders a different tree with one than without (Android and web wrap
 * the scroll view in it, iOS puts it ahead of the content), so handing it in
 * once the first data hook registered remounted the whole screen body right
 * after the screen opened — every child mounted twice, a tap in that moment
 * landed on a node that was about to be thrown away. So on a screen the
 * control is always there, and is switched off while nothing is registered to
 * reload (Android; iOS has no off switch, so there a pull on such a screen ends
 * at once — see `refresh` in ScreenRefreshProvider).
 *
 * Web has no pull gesture, and react-native-web's RefreshControl is only a
 * wrapper view, so web gets none; outside a screen (a floating dialog, a test)
 * there is nothing to reload either.
 */
export function useScreenRefreshControl(): ReactElement<RefreshControlProps> | undefined {
  const screen = useScreenRefresh();
  const control = useAppRefreshControl({
    refreshing: screen?.refreshing ?? false,
    onRefresh: screen?.refresh ?? (() => undefined),
    enabled: screen?.hasHandlers ?? false,
    testID: 'screen-refresh',
  });
  if (Platform.OS === 'web' || !screen) return undefined;
  return control;
}
