import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';

/** 404 — shown for unknown deep links / unmatched routes. RN twin of mWeb's
 * NotFound page; offers a route back to Home. */
export function NotFoundScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { primary, onPrimary } = useThemeColors();

  return (
    <YStack flex={1} testID="not-found-screen">
      <AppBackground />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <YStack flex={1} alignItems="center" justifyContent="center" gap={14} padding={24}>
          <MaterialIcons name="search-off" size={56} color={primary} />
          <Text fontSize={48} fontWeight="900" color="$color">
            404
          </Text>
          <Text fontSize={18} fontWeight="900" color="$color" textAlign="center">
            Page not found
          </Text>
          <Text fontSize={14} color="$muted" textAlign="center">
            The page you’re looking for doesn’t exist or has moved.
          </Text>
          <YStack
            testID="not-found-home"
            role="button"
            aria-label="Go to home"
            onPress={() => navigation.navigate('Home')}
            marginTop={4}
            paddingHorizontal={22}
            paddingVertical={12}
            borderRadius={999}
            backgroundColor="$primary"
            pressStyle={{ opacity: 0.85 }}
          >
            <Text fontSize={14} fontWeight="900" color={onPrimary}>
              Go to Home
            </Text>
          </YStack>
        </YStack>
      </SafeAreaView>
    </YStack>
  );
}
