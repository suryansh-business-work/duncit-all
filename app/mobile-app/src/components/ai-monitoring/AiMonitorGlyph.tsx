import { Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { YStack } from 'tamagui';

import { AI_MONITOR_GRADIENT, AI_MONITOR_MOTION, AI_MONITOR_RINGS } from '@duncit/utils';
import { useAiMonitorLoop } from './useAiMonitorLoop';

const { breatheMs, rippleMs, breatheScale, ringFrom, ringTo, ringOpacity } = AI_MONITOR_MOTION;

interface Props {
  /** Diameter of the gradient orb, in px. */
  size?: number;
  /** Emit rings. On while a check is actually running, off when the glyph is
   * only a label's badge. */
  rings?: boolean;
  testID?: string;
}

/**
 * The AI Monitoring badge: a gradient orb with a spark in it, breathing, and
 * emitting rings while a check runs.
 *
 * The Tamagui twin of `@duncit/ai-monitoring/mui`'s `AiMonitorGlyph`, down to
 * the timings — both read them from `AI_MONITOR_MOTION`, so the app and mWeb
 * cannot animate the same badge at two different speeds (rule 27).
 *
 * Each ring is its own looping value offset by its delay, rather than one
 * shared value read twice: RN's `Animated.loop` has no per-consumer delay, so
 * two views on one driver would leave the badge bare for a whole ripple.
 */
export function AiMonitorGlyph({ size = 24, rings = false, testID }: Readonly<Props>) {
  const breath = useAiMonitorLoop(true, breatheMs);
  // One loop per ring, offset by that ring's delay. Hooks cannot be called from
  // a `.map`, so the two AI_MONITOR_RINGS entries are read by position here —
  // adding a third ring means adding a third line, deliberately.
  const lead = useAiMonitorLoop(rings, rippleMs, AI_MONITOR_RINGS[0].delayMs);
  const trail = useAiMonitorLoop(rings, rippleMs, AI_MONITOR_RINGS[1].delayMs);
  const ringLoops = [
    { ring: AI_MONITOR_RINGS[0], value: lead },
    { ring: AI_MONITOR_RINGS[1], value: trail },
  ];

  // Room for a ring at full flight, or none at all when there are no rings —
  // an empty halo around a chip-sized badge would push its label off-centre.
  const frame = rings ? Math.round(size * ringTo) : size;
  const breatheStyle = {
    transform: [
      {
        scale: breath.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, breatheScale, 1],
        }),
      },
    ],
  };

  return (
    <YStack
      testID={testID}
      width={frame}
      height={frame}
      alignItems="center"
      justifyContent="center"
    >
      {rings
        ? ringLoops.map(({ ring, value }) => (
            <Animated.View
              key={ring.id}
              style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor: 'rgba(236,72,153,0.85)',
                opacity: value.interpolate({ inputRange: [0, 1], outputRange: [ringOpacity, 0] }),
                transform: [
                  {
                    scale: value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [ringFrom, ringTo],
                    }),
                  },
                ],
              }}
            />
          ))
        : null}
      <Animated.View style={breatheStyle}>
        <LinearGradient
          colors={AI_MONITOR_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MaterialIcons name="auto-awesome" size={Math.round(size * 0.56)} color="#ffffff" />
        </LinearGradient>
      </Animated.View>
    </YStack>
  );
}
