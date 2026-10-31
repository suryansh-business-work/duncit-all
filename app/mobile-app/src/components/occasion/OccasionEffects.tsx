import { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { occasionScene, type OccasionDecoration } from '@duncit/utils';

import { OccasionFireworks } from './OccasionFireworks';
import { OccasionFlyer } from './OccasionFlyer';
import { OccasionGarland } from './OccasionGarland';
import { OccasionOverlays } from './OccasionOverlays';
import { OccasionParticles } from './OccasionParticles';
import { drawableFlyers } from './scene-parts';
import { useOccasionClock } from './useOccasionClock';

export interface OccasionEffectsProps {
  decoration: OccasionDecoration;
  /** Whether the clock moves; stopped, the decoration holds still where it is. */
  running: boolean;
}

/**
 * A look's decoration over the whole app, back to front the way the web
 * canvas paints it: atmosphere, particle swarms, fireworks, flyers and the
 * garland on top. The engine lays it out once per look and screen size; the
 * UI thread moves it from one clock. Purely decorative: hidden from screen
 * readers and transparent to every touch.
 */
export function OccasionEffects({ decoration, running }: Readonly<OccasionEffectsProps>) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const clock = useOccasionClock(running);
  const box = useMemo(() => ({ width, height }), [width, height]);
  const scene = useMemo(
    () => occasionScene(decoration, width, height),
    [decoration, width, height],
  );
  const layers = useMemo(
    () => scene.layers.map((layer, n) => ({ id: `layer-${n}`, layer })),
    [scene],
  );
  const flyers = useMemo(() => drawableFlyers(scene), [scene]);

  return (
    <View
      testID="occasion-effects"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.sky]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <OccasionOverlays scene={scene} box={box} clock={clock} />
      {layers.map(({ id, layer }) => (
        <OccasionParticles key={id} layer={layer} box={box} clock={clock} />
      ))}
      <OccasionFireworks fireworks={scene.fireworks} box={box} clock={clock} />
      {flyers.map((entry) => (
        <OccasionFlyer key={entry.id} entry={entry} box={box} clock={clock} />
      ))}
      <OccasionGarland marks={scene.garland} width={width} top={insets.top} clock={clock} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Positions are physical screen pixels from the engine: an RTL layout must not flip them.
  sky: { direction: 'ltr', overflow: 'hidden' },
});
