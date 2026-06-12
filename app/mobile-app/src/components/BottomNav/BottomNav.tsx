import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { durations } from '@/animations/motion';
import { useThemeColors } from '@/hooks/useThemeColors';
import { TAB_CONFIG } from '@/navigation/tabs';

/** Edge-to-edge flat tab bar — full width, no border radius, with the active
 * tab tinted in the primary colour (icon scales in smoothly). Identical to
 * mWeb's BottomNav. Used as React Navigation's custom `tabBar`. */
export function BottomNav({ state, navigation }: Readonly<BottomTabBarProps>) {
  const insets = useSafeAreaInsets();
  const { muted, onPrimary } = useThemeColors();

  return (
    <XStack
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      backgroundColor="$surface"
      borderTopWidth={1}
      borderColor="$borderColor"
      paddingTop={6}
      paddingBottom={insets.bottom + 6}
      justifyContent="space-between"
      shadowColor="#000000"
      shadowOpacity={0.14}
      shadowRadius={18}
      shadowOffset={{ width: 0, height: -6 }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const cfg = TAB_CONFIG.find((t) => t.name === route.name);
        if (!cfg) return null;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <YStack
            key={route.key}
            testID={`tab-bar-${cfg.name}`}
            role="button"
            aria-label={cfg.label}
            aria-pressed={focused}
            onPress={onPress}
            flex={1}
            alignItems="center"
            gap={2}
            paddingVertical={4}
            pressStyle={{ opacity: 0.85 }}
          >
            <MotiView
              animate={{ scale: focused ? 1.1 : 0.92, translateY: focused ? -2 : 0 }}
              transition={{ type: 'timing', duration: durations.fast }}
            >
              {/* Selection bubble — the active icon pops inside a primary circle (B4-8). */}
              <YStack
                width={38}
                height={38}
                alignItems="center"
                justifyContent="center"
                borderRadius={19}
                backgroundColor={focused ? '$primary' : 'transparent'}
              >
                <MaterialIcons name={cfg.icon} size={21} color={focused ? onPrimary : muted} />
              </YStack>
            </MotiView>
            <Text fontSize={11} fontWeight="800" color={focused ? '$primary' : '$muted'}>
              {cfg.label}
            </Text>
          </YStack>
        );
      })}
    </XStack>
  );
}
