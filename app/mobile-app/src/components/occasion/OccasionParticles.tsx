import { memo, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { particlePeriod, type OccasionMotion, type OccasionParticle } from '@duncit/utils';

import { markStyle, particleFrame, type Box } from './motion-worklets';
import { particleMarks, type SceneLayer } from './scene-parts';

interface MarkProps {
  particle: OccasionParticle;
  path: string;
  motion: OccasionMotion;
  opacity: number;
  box: Box;
  clock: SharedValue<number>;
}

/**
 * One mark: a small vector drawn once, in a view the UI thread moves —
 * falling, rising or drifting with its sway and 3D tumble, or twinkling in
 * place — from the shared clock.
 */
function ParticleMark({ particle, path, motion, opacity, box, clock }: Readonly<MarkProps>) {
  const period = particlePeriod(particle, motion, box.width, box.height);
  const pose = useAnimatedStyle(() =>
    markStyle(particleFrame(particle, motion, clock.value, period, box, opacity)),
  );
  const half = particle.size / 2;
  return (
    <Animated.View
      testID="occasion-mark"
      style={[
        styles.mark,
        { left: -half, top: -half, width: particle.size, height: particle.size },
        pose,
      ]}
    >
      <Svg width={particle.size} height={particle.size} viewBox="0 0 24 24">
        <Path d={path} fill={particle.color} />
      </Svg>
    </Animated.View>
  );
}

/** A swarm — snow, petals, sparks, bats — far marks first so the near ones pass over them. */
export const OccasionParticles = memo(function OccasionParticles({
  layer,
  box,
  clock,
}: Readonly<{ layer: SceneLayer; box: Box; clock: SharedValue<number> }>) {
  const marks = useMemo(() => particleMarks(layer), [layer]);
  return (
    <>
      {marks.map((mark) => (
        <ParticleMark
          key={mark.id}
          particle={mark.particle}
          path={mark.path}
          motion={layer.motion}
          opacity={layer.opacity}
          box={box}
          clock={clock}
        />
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  mark: { position: 'absolute' },
});
