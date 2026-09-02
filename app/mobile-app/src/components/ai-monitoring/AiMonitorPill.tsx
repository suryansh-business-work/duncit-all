import { Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { AI_MONITOR_GRADIENT } from '@duncit/utils';
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
 * same `AI_MONITOR_MOTION` timings (rule 27). The sweep is drawn as a gradient
 * twice the pill's width sliding under a clipped row, because React Native has
 * no `background-position` to animate — and it goes there and back, so neither
 * surface has a visible jump at the loop's seam.
 */
export function AiMonitorPill({ label, onPress, ariaLabel, testID }: Readonly<Props>) {
  const sweepStyle = useAiSweep(true, '0%', '-50%');
  const twinkleStyle = useAiTwinkle(true);

  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={ariaLabel ?? label}
      onPress={onPress}
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
      <Animated.View style={twinkleStyle}>
        <MaterialIcons name="auto-awesome" size={13} color="#ffffff" />
      </Animated.View>
      <Text fontSize={11} fontWeight="700" color="#ffffff">
        {label}
      </Text>
    </XStack>
  );
}
