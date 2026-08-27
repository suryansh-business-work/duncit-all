import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** Height of the track, reserved whether or not the bar is running. */
const TRACK_HEIGHT = 2;
/** Share of the track the moving segment covers. */
const SEGMENT_RATIO = 0.4;
/** One pass across the track, in ms. */
const SWEEP_MS = 1100;

/**
 * The thin bar across the top of the menu while its data is being refreshed in
 * the background — the twin of mWeb's <MenuRefreshBar/>.
 *
 * The panel skeleton only stands in when there is nothing at all to show, which
 * on a warm store is never: `me` is already loaded by the time the menu opens.
 * This is what says the menu is re-reading anyway, without flashing a skeleton
 * over content that is already correct. The track keeps its height either way,
 * so nothing shifts when the bar appears.
 */
export function SidebarRefreshBar({ active }: Readonly<{ active: boolean }>) {
  const { primary } = useThemeColors();
  const { t } = useTranslation();
  const [trackWidth, setTrackWidth] = useState(0);
  const sweep = useRef(new Animated.Value(0)).current;
  const running = active && trackWidth > 0;

  useEffect(() => {
    if (!running) return;
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: SWEEP_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    // The bar is mounted only while a read is in flight, but stop the loop on
    // the way out so a menu closed mid-refresh leaves nothing animating.
    return () => loop.stop();
  }, [running, sweep]);

  const segmentWidth = trackWidth * SEGMENT_RATIO;

  return (
    <View
      testID="sidebar-refresh-bar"
      accessibilityLabel={t('mweb.sidebar.refreshing')}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      style={{ height: TRACK_HEIGHT, overflow: 'hidden' }}
    >
      {running ? (
        <Animated.View
          style={{
            height: TRACK_HEIGHT,
            width: segmentWidth,
            backgroundColor: primary,
            transform: [
              {
                translateX: sweep.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-segmentWidth, trackWidth],
                }),
              },
            ],
          }}
        />
      ) : null}
    </View>
  );
}
