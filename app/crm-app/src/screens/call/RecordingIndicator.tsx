import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { Text, XStack, useTheme } from 'tamagui';
import { tokens } from '@duncit/theme/tokens';
import { logs } from '@duncit/logs';

import { useTranslation } from '@/hooks/useTranslation';

/** One breath of the dot: fade and shrink, then back. */
const PULSE_MS = tokens.motion.slow * 3;
const DOT = tokens.size.icon.sm * 0.75;

/**
 * "Recording" with a pulsing red dot, shown while a call on the CRM call line
 * is connected and being recorded — so the agent always knows the call is on
 * the record. With the phone's "reduce motion" on, the dot stays still.
 */
export function RecordingIndicator() {
  const { t } = useTranslation();
  const theme = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;
  const [still, setStill] = useState(true);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (!cancelled) setStill(reduce);
      })
      .catch((error: unknown) => {
        logs.mobileApp.warn('crm-app/RecordingIndicator', 'reduceMotion', { error });
        if (!cancelled) setStill(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (still) return undefined;
    const step = (toValue: number) =>
      Animated.timing(pulse, {
        toValue,
        duration: PULSE_MS / 2,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      });
    const loop = Animated.loop(Animated.sequence([step(0.3), step(1)]));
    loop.start();
    return () => loop.stop();
  }, [still, pulse]);

  const scale = pulse.interpolate({ inputRange: [0.3, 1], outputRange: [0.7, 1] });
  return (
    <XStack
      alignItems="center"
      gap="$2"
      paddingHorizontal="$3"
      paddingVertical="$1"
      borderRadius={DOT}
      backgroundColor="$dangerSoft"
      role="status"
      aria-live="polite"
      aria-label={t('crmApp.call.recording')}
      testID="call-recording"
    >
      <Animated.View
        style={{
          width: DOT,
          height: DOT,
          borderRadius: DOT / 2,
          backgroundColor: theme.danger?.val,
          opacity: pulse,
          transform: [{ scale }],
        }}
      />
      <Text color="$danger" fontWeight="700" fontSize="$2">
        {t('crmApp.call.recording')}
      </Text>
    </XStack>
  );
}
