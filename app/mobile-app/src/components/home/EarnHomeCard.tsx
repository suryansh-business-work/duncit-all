import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

type RoleIcon = 'groups' | 'storefront' | 'volunteer-activism';

/** One of the ways to earn — hosting, a venue, a brand — as a disc that bobs on its own beat. */
function RoleDisc({ icon, delay, overlap }: Readonly<{ icon: RoleIcon; delay: number; overlap: boolean }>) {
  const { brand, onPrimary } = useThemeColors();
  const reduceMotion = useReduceMotion();
  const lift = useSharedValue(0);
  useEffect(() => {
    // Endless motion nobody can pause is held still under Reduce Motion (WCAG 2.2.2).
    if (reduceMotion) return;
    lift.value = withDelay(delay, withRepeat(withTiming(-4, { duration: 1600 }), -1, true));
  }, [delay, lift, reduceMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));

  return (
    <Animated.View
      style={[styles.disc, overlap && styles.overlap, { borderColor: onPrimary, backgroundColor: brand }, style]}
    >
      <MaterialIcons name={icon} size={18} color={onPrimary} />
    </Animated.View>
  );
}

/**
 * Earn with Duncit, on Home just above Previous Pods: one tap into the app's
 * Earn screen, where hosting, venues, brands and freelancing are offered. A
 * brand-gradient card with gently moving discs so it reads as something to
 * try, not an ad. mWeb twin: home-page/EarnHomeCard.
 */
export function EarnHomeCard({ onOpen }: Readonly<{ onOpen: () => void }>) {
  const { t } = useTranslation();
  const { brand, primary, onPrimary } = useThemeColors();
  const title = t('mweb.meta.earn.title');

  return (
    <XStack
      testID="home-earn-card"
      role="button"
      tabIndex={0}
      aria-label={title}
      onPress={onOpen}
      marginHorizontal={16}
      borderRadius={20}
      overflow="hidden"
      pressStyle={PRESS_STYLE.surface}
    >
      <LinearGradient
        colors={[brand, primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <XStack flex={1} alignItems="center" gap={12} padding={16}>
        <XStack>
          <RoleDisc icon="groups" delay={0} overlap={false} />
          <RoleDisc icon="storefront" delay={400} overlap />
          <RoleDisc icon="volunteer-activism" delay={800} overlap />
        </XStack>
        <YStack flex={1} minWidth={0} gap={2}>
          <Text role="heading" fontSize={16} fontWeight="700" color="$onPrimary" numberOfLines={1}>
            {title}
          </Text>
          <Text fontSize={13} color="$onPrimary" opacity={0.9} numberOfLines={2}>
            {t('mweb.meta.earn.description')}
          </Text>
        </YStack>
        <MaterialIcons name="arrow-forward" size={22} color={onPrimary} aria-hidden />
      </XStack>
    </XStack>
  );
}

const styles = StyleSheet.create({
  disc: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlap: { marginLeft: -8 },
});
