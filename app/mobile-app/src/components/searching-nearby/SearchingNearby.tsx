import { useEffect, useRef, type ComponentProps } from 'react';
import { Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Three rings, a third of the cycle apart, so one is always leaving the centre. */
const RIPPLE_MS = 2400;
const SWEEP_MS = 3000;
const RIPPLES = [0, 1, 2];
const SIZE = 168;
const CORE = SIZE / 3;
/** Where each ring rests when motion is off: spread out, faint. */
const STILL_SCALES = [0.45, 0.7, 0.95];
/** Module-level so the loops keep one identity and never restart on a render. */
const RIPPLE_EASING = Easing.out(Easing.cubic);
const SWEEP_EASING = Easing.linear;

interface Props {
  /** "Searching Nearby Hosts..." / "Searching Nearby Venues...". */
  title: string;
  /** What is being searched — the radius and the place. */
  hint: string;
  /** The centre mark: a host or a venue glyph. */
  icon: IconName;
  testID?: string;
}

/** One value driven 0 → 1 forever on the native driver — or held when motion is off. */
function useLoop(
  duration: number,
  delay: number,
  easing: (value: number) => number,
  still: boolean,
) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) {
      value.setValue(0);
      return undefined;
    }
    // The offset is paid once, so the rings stay a third of a cycle apart.
    const loop = Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: true }),
      ),
    ]);
    loop.start();
    return () => loop.stop();
  }, [value, duration, delay, easing, still]);
  return value;
}

function Ripple({
  index,
  still,
  color,
}: Readonly<{ index: number; still: boolean; color: string }>) {
  const progress = useLoop(RIPPLE_MS, (index * RIPPLE_MS) / RIPPLES.length, RIPPLE_EASING, still);
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        borderWidth: 2,
        borderColor: color,
        opacity: still ? 0.25 : opacity,
        transform: [{ scale: still ? (STILL_SCALES[index] ?? 1) : scale }],
      }}
    />
  );
}

/**
 * The "Searching nearby…" radar the Pod Request searches show while a search
 * runs: rings ripple out from a centre mark while a soft sweep turns, so the
 * wait reads as "still looking", not "broken". Theme colours only, the native
 * driver for every frame, and still when the device asks for less motion. The
 * words are a polite status. mWeb twin: components/searching-nearby.
 */
export function SearchingNearby({
  title,
  hint,
  icon,
  testID = 'searching-nearby',
}: Readonly<Props>) {
  const { primary, onPrimary } = useThemeColors();
  const still = useReduceMotion();
  const sweep = useLoop(SWEEP_MS, 0, SWEEP_EASING, still);
  const rotate = sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <YStack
      testID={testID}
      role="status"
      aria-live="polite"
      alignItems="center"
      gap={16}
      paddingVertical={24}
    >
      <YStack width={SIZE} height={SIZE} alignItems="center" justifyContent="center" aria-hidden>
        {RIPPLES.map((index) => (
          <Ripple key={index} index={index} still={still} color={primary} />
        ))}
        <Animated.View
          pointerEvents="none"
          style={{ position: 'absolute', width: SIZE, height: SIZE, transform: [{ rotate }] }}
        >
          <YStack
            position="absolute"
            left={SIZE / 2}
            top={0}
            width={SIZE / 2}
            height={SIZE / 2}
            borderTopRightRadius={SIZE / 2}
            backgroundColor="$primary"
            opacity={0.18}
          />
        </Animated.View>
        <YStack
          width={CORE}
          height={CORE}
          borderRadius={CORE / 2}
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
        >
          <MaterialIcons name={icon} size={24} color={onPrimary} />
        </YStack>
      </YStack>
      <Text fontSize={16} fontWeight="700" color="$color" textAlign="center">
        {title}
      </Text>
      <Text fontSize={13} color="$muted" textAlign="center" maxWidth={320}>
        {hint}
      </Text>
    </YStack>
  );
}
