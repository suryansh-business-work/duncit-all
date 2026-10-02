import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { CartNudgeTextAction, CartNudgeThumbs } from '@/components/cart/CartNudgeParts';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useBottomNavSpace } from '@/hooks/useBottomNavSpace';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { CartLine } from '@/stores/cart.store';

const SHADOW_OFFSET = { width: 0, height: 8 } as const;

interface Props {
  lines: CartLine[];
  totalCount: number;
  hideMs: number;
  onCheckout: () => void;
  /** Auto-hide ran out, or the close button: due again after the delay. */
  onHide: () => void;
  onLater: () => void;
  onMute: () => void;
}

/**
 * "Your cart is calling" — a card that slides up above the bottom nav while the
 * cart holds products, with a draining bar for the time left. With a screen
 * reader on it never hides itself, so nobody loses it mid-read (WCAG 2.2.1).
 * Mounted only while open. Twin of mWeb's CartReminderNudge.
 */
export function CartReminderNudge(props: Readonly<Props>) {
  const { lines, totalCount, hideMs, onCheckout, onHide, onLater, onMute } = props;
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const bottom = useBottomNavSpace(8);
  const enter = useRef(new Animated.Value(0)).current;
  const timer = useRef(new Animated.Value(1)).current;
  const [screenReader, setScreenReader] = useState<boolean | null>(null);

  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled()
      .then(setScreenReader)
      .catch(() => setScreenReader(false));
    Animated.timing(enter, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [enter]);

  useEffect(() => {
    if (screenReader !== false) return undefined;
    const run = Animated.timing(timer, {
      toValue: 0,
      duration: hideMs,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    run.start(({ finished }) => finished && onHide());
    return () => run.stop();
  }, [screenReader, hideMs, timer, onHide]);

  const body =
    totalCount === 1
      ? t('mweb.cart.nudgeBodyOne')
      : t('mweb.cart.nudgeBodyMany', { vars: { count: totalCount } });
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <Animated.View
      testID="cart-nudge"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom,
        opacity: enter,
        transform: [{ translateY }],
      }}
    >
      <YStack
        role="region"
        aria-label={t('mweb.cart.nudgeTitle')}
        backgroundColor="$surface"
        borderRadius={24}
        borderWidth={1}
        borderColor="$cardBorder"
        overflow="hidden"
        shadowColor="#000000"
        shadowOpacity={0.12}
        shadowRadius={16}
        shadowOffset={SHADOW_OFFSET}
      >
        <YStack padding={16} gap={12}>
          <XStack gap={12} alignItems="center">
            <CartNudgeThumbs lines={lines} />
            <YStack flex={1} minWidth={0} aria-live="polite">
              <Text fontSize={15} fontWeight="700" color="$color">
                {t('mweb.cart.nudgeTitle')}
              </Text>
              <Text fontSize={13} color="$muted">
                {body}
              </Text>
            </YStack>
            <XStack
              testID="cart-nudge-close"
              role="button"
              tabIndex={0}
              aria-label={t('mweb.cart.nudgeDismiss')}
              hitSlop={8}
              onPress={onHide}
              alignSelf="flex-start"
              pressStyle={PRESS_STYLE.control}
            >
              <MaterialIcons name="close" size={20} color={muted} />
            </XStack>
          </XStack>
          <PrimaryButton
            testID="cart-nudge-checkout"
            label={t('mweb.cart.nudgeCheckout')}
            onPress={onCheckout}
          />
          <XStack justifyContent="space-between">
            <CartNudgeTextAction
              testID="cart-nudge-later"
              label={t('mweb.cart.nudgeLater')}
              onPress={onLater}
            />
            <CartNudgeTextAction
              testID="cart-nudge-mute"
              label={t('mweb.cart.nudgeMute')}
              onPress={onMute}
            />
          </XStack>
        </YStack>
        <Animated.View
          aria-hidden
          style={{ height: 3, transform: [{ scaleX: timer }], transformOrigin: 'left' }}
        >
          <YStack flex={1} backgroundColor="$primary" />
        </Animated.View>
      </YStack>
    </Animated.View>
  );
}
