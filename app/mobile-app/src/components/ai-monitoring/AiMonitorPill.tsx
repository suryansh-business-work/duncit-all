import { Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { AI_MONITOR_GRADIENT, AI_MONITOR_MOTION } from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { useAiSweep, useAiTwinkle } from './useAiTwinkle';

interface Props {
  label: string;
  onPress: () => void;
  /** What the pill opens, for a screen reader. Defaults to the label. */
  ariaLabel?: string;
  testID?: string;
}

/**
 * The gradient "AI Monitoring" pill — colour sliding under it, spark turning.
 *
 * The Tamagui twin of `@duncit/ai-monitoring/mui`'s `AiMonitorPill`, on the
 * same `AI_MONITOR_MOTION` timings (rule 27). The drift is drawn as a gradient
 * twice the pill's width sliding under a clipped row, because React Native has
 * no `background-position` to animate — and it goes there and back, so neither
 * surface has a visible jump at the loop's seam. One loop is a full round trip,
 * so it runs twice `driftMs`, the time mWeb's alternating sweep takes each way.
 */
export function AiMonitorPill({ label, onPress, ariaLabel, testID }: Readonly<Props>) {
  const { sweepStyle, onLayout } = useAiSweep(true, 0, -1, AI_MONITOR_MOTION.driftMs * 2);
  const twinkleStyle = useAiTwinkle(true);

  return (
    <XStack
      testID={testID}
      role="button"
      tabIndex={0}
      hitSlop={6}
      aria-label={ariaLabel ?? label}
      onPress={onPress}
      onLayout={onLayout}
      pressStyle={PRESS_STYLE.control}
      borderRadius={999}
      overflow="hidden"
      alignItems="center"
      gap={5}
      paddingHorizontal={10}
      paddingVertical={6}
    >
      <Animated.View
        style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '200%' }, sweepStyle]}
      >
        <LinearGradient
          colors={AI_MONITOR_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>
      {/* mWeb's 35% ink scrim: white 11px text fails on the amber/pink stops without it. */}
      <XStack
        position="absolute"
        top={0}
        bottom={0}
        left={0}
        right={0}
        backgroundColor="rgba(0,0,0,0.35)"
      />
      <Animated.View style={twinkleStyle}>
        <MaterialIcons name="auto-awesome" size={13} color="#ffffff" />
      </Animated.View>
      <Text fontSize={11} fontWeight="700" color="#ffffff">
        {label}
      </Text>
    </XStack>
  );
}
