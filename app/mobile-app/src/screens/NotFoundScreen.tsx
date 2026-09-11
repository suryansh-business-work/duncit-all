import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { DuncitButton } from '@/components/DuncitButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { RootStackParamList } from '@/navigation/types';
import { useTranslation } from '@/hooks/useTranslation';

/** 404 — shown for unknown deep links / unmatched routes: one icon, one line,
 * one way home. RN twin of mWeb's NotFound page. */
export function NotFoundScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { accent } = useThemeColors();

  return (
    <YStack flex={1} testID="not-found-screen">
      <AppBackground />
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        <YStack flex={1} alignItems="center" justifyContent="center" gap={16} padding={24}>
          <YStack
            width={96}
            height={96}
            borderRadius={48}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$surface"
          >
            <MaterialIcons name="search-off" size={44} color={accent} />
          </YStack>
          <Text fontSize={20} fontWeight="600" color="$color" textAlign="center">
            Page not found
          </Text>
          <DuncitButton
            testID="not-found-home"
            label={t('mweb.notFound.goToHome')}
            onPress={() => navigation.navigate('Home')}
            size="lg"
          />
        </YStack>
      </SafeAreaView>
    </YStack>
  );
}
