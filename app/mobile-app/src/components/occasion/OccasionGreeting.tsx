import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { neutral, radii } from '@duncit/auth-tokens';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { markGreeted, wasGreeted } from './occasion-prefs';

/** Long enough to read a short line twice, short enough not to linger over the screen. */
const SHOW_MS = 6000;
const GROW_MS = 450;
/** Clears the app header's row of round buttons, as mWeb's greeting does. */
const HEADER_CLEARANCE = 72;
const CLOSE_SIZE = 32;

interface Props {
  lookKey: string;
  text: string;
  reduceMotion: boolean;
}

/**
 * The look's festive line ("Merry Christmas from Duncit!") in a pill of the
 * look's own primary colours under the header — once per launch per look,
 * announced politely to screen readers and gone by itself after a few
 * seconds, or straight away with its close button.
 */
export function OccasionGreeting({ lookKey, text, reduceMotion }: Readonly<Props>) {
  const { t } = useTranslation();
  const { onPrimary } = useThemeColors();
  const insets = useSafeAreaInsets();
  const line = text.trim();
  const [open, setOpen] = useState(() => line !== '' && !wasGreeted(lookKey));
  const grown = useSharedValue(0);
  const grow = useAnimatedStyle(() => ({
    opacity: grown.value,
    transform: [{ scale: 0.9 + 0.1 * grown.value }],
  }));

  useEffect(() => {
    if (!open) return undefined;
    markGreeted(lookKey);
    // Android reads the live region below; iOS has no live regions, so it is told.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(line);
    const timer = setTimeout(() => setOpen(false), SHOW_MS);
    return () => clearTimeout(timer);
  }, [open, lookKey, line]);

  // Apart from the effect above: the Reduce Motion setting arrives a moment
  // after mount, and must not announce the line a second time.
  useEffect(() => {
    grown.value = withTiming(1, { duration: reduceMotion ? 0 : GROW_MS });
  }, [reduceMotion, grown]);

  if (!open) return null;

  return (
    <View pointerEvents="box-none" style={[styles.row, { top: insets.top + HEADER_CLEARANCE }]}>
      <Animated.View style={grow} accessibilityLiveRegion="polite">
        <XStack
          testID="occasion-greeting"
          alignItems="center"
          gap={8}
          maxWidth={480}
          paddingVertical={6}
          paddingLeft={14}
          paddingRight={6}
          borderRadius={radii.pill}
          backgroundColor="$primary"
          shadowColor={neutral[900]}
          shadowOpacity={0.2}
          shadowRadius={10}
          shadowOffset={{ width: 0, height: 4 }}
        >
          <MaterialIcons name="celebration" size={18} color={onPrimary} />
          <Text flexShrink={1} fontSize={14} fontWeight="700" color="$onPrimary">
            {line}
          </Text>
          <XStack
            testID="occasion-greeting-close"
            role="button"
            aria-label={t('ui.occasion.dismiss')}
            tabIndex={0}
            // 32 drawn, 44 touchable.
            hitSlop={6}
            onPress={() => setOpen(false)}
            width={CLOSE_SIZE}
            height={CLOSE_SIZE}
            borderRadius={radii.pill}
            alignItems="center"
            justifyContent="center"
            pressStyle={PRESS_STYLE.ghost}
          >
            <MaterialIcons name="close" size={18} color={onPrimary} />
          </XStack>
        </XStack>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 16, alignItems: 'center' },
});
