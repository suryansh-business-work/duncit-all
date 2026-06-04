import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { TAB_CONFIG } from '@/navigation/tabs';

/** Floating pill tab bar — RN port of mWeb's BottomNav (gradient active icon,
 * blurred surface, rounded corners). Used as React Navigation's custom `tabBar`. */
export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { muted } = useThemeColors();

  return (
    <XStack
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      justifyContent="center"
      paddingHorizontal={12}
      paddingBottom={insets.bottom + 8}
      pointerEvents="box-none"
    >
      <XStack
        flex={1}
        maxWidth={520}
        backgroundColor="$surface"
        borderRadius={24}
        borderWidth={1}
        borderColor="$borderColor"
        padding={6}
        justifyContent="space-between"
        shadowColor="#000000"
        shadowOpacity={0.14}
        shadowRadius={18}
        shadowOffset={{ width: 0, height: 10 }}
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
              aria-selected={focused}
              onPress={onPress}
              flex={1}
              alignItems="center"
              gap={2}
              paddingVertical={4}
              pressStyle={{ opacity: 0.7 }}
            >
              {focused ? (
                <LinearGradient
                  colors={['#ff4f73', '#f5337a']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialIcons name={cfg.icon} size={20} color="#ffffff" />
                </LinearGradient>
              ) : (
                <YStack
                  width={34}
                  height={34}
                  borderRadius={12}
                  alignItems="center"
                  justifyContent="center"
                >
                  <MaterialIcons name={cfg.icon} size={20} color={muted} />
                </YStack>
              )}
              <Text fontSize={11} fontWeight="800" color={focused ? '$primary' : '$muted'}>
                {cfg.label}
              </Text>
            </YStack>
          );
        })}
      </XStack>
    </XStack>
  );
}
