import type { ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { useThemeColors } from '@/hooks/useThemeColors';

interface StackScreenProps {
  title: string;
  testID: string;
  children: ReactNode;
  right?: ReactNode;
}

/** Shared scaffold for pushed (stack) screens: gradient backdrop + a back-bar
 * with the title (and optional right action). */
export function StackScreen({ title, testID, children, right }: StackScreenProps) {
  const navigation = useNavigation();
  const { color: ink } = useThemeColors();

  return (
    <YStack flex={1} testID={testID}>
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <XStack alignItems="center" gap={8} paddingHorizontal={12} paddingVertical={8}>
          <XStack
            testID={`${testID}-back`}
            role="button"
            aria-label="Go back"
            onPress={() => navigation.goBack()}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons name="arrow-back" size={22} color={ink} />
          </XStack>
          <Text flex={1} fontSize={18} fontWeight="800" color="$color" numberOfLines={1}>
            {title}
          </Text>
          {right}
        </XStack>
        {children}
      </SafeAreaView>
    </YStack>
  );
}
