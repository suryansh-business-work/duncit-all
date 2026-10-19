import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useThemeColors } from '@/hooks/useThemeColors';

/** How far the bubble follows the finger, and how far counts as "reply". */
const MAX_DRAG = 80;
export const REPLY_THRESHOLD = 56;

interface Props {
  children: ReactNode;
  /** Absent when replying is not possible (a removed line, a closed room). */
  onReply?: () => void;
}

/**
 * WhatsApp's swipe-right-to-reply. The pan only claims clearly horizontal
 * drags (it fails on vertical movement), so the list still scrolls. The long
 * press menu's Reply row is the equivalent for anyone who cannot swipe.
 */
export function SwipeToReply({ children, onReply }: Readonly<Props>) {
  const { muted } = useThemeColors();
  const dragX = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(!!onReply)
    .activeOffsetX(12)
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      dragX.value = Math.max(0, Math.min(MAX_DRAG, e.translationX));
    })
    .onEnd(() => {
      if (dragX.value >= REPLY_THRESHOLD && onReply) scheduleOnRN(onReply);
      dragX.value = withSpring(0);
    });

  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dragX.value }] }));
  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(dragX.value, [0, REPLY_THRESHOLD], [0, 1]),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View>
        <Animated.View style={[styles.icon, iconStyle]} pointerEvents="none">
          <MaterialIcons name="reply" size={20} color={muted} />
        </Animated.View>
        <Animated.View style={bubbleStyle}>{children}</Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  icon: { position: 'absolute', left: 8, top: 0, bottom: 0, justifyContent: 'center' },
});
