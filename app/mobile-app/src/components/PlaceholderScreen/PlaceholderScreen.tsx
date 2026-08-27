import type { ComponentProps } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppBackground } from '@/components/AppBackground';
import { useGoBack } from '@/hooks/useGoBack';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/**
 * Shared scaffold for the account-menu destinations. Each screen routed from the
 * sidebar renders this with its own title/icon; a back bar returns to the stack.
 * These are intentionally light placeholders until the real features land.
 */
export function PlaceholderScreen({
  title,
  subtitle,
  icon = 'auto-awesome',
}: Readonly<{
  title: string;
  subtitle?: string;
  icon?: IconName;
}>) {
  const { t } = useTranslation();
  const goBack = useGoBack();
  const { color: ink, primary } = useThemeColors();

  return (
    <YStack flex={1} testID="placeholder-screen">
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <XStack alignItems="center" gap={8} paddingHorizontal={12} paddingVertical={8}>
          <XStack
            testID="placeholder-back"
            role="button"
            aria-label={t('mweb.common.goBack')}
            onPress={goBack}
            width={40}
            height={40}
            alignItems="center"
            justifyContent="center"
            borderRadius={20}
            pressStyle={PRESS_STYLE.row}
          >
            <MaterialIcons name="arrow-back" size={22} color={ink} />
          </XStack>
          <Text fontSize={18} fontWeight="600" color="$color">
            {title}
          </Text>
        </XStack>

        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          gap={12}
          paddingHorizontal={32}
        >
          <MaterialIcons name={icon} size={56} color={primary} />
          <Text textAlign="center" fontSize={24} fontWeight="600" color="$color">
            {title}
          </Text>
          <Text textAlign="center" fontSize={14} color="$muted">
            {subtitle ?? 'This space is coming soon.'}
          </Text>
        </YStack>
      </SafeAreaView>
    </YStack>
  );
}
