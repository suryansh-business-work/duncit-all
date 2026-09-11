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
  const { color: ink, accent } = useThemeColors();

  return (
    <YStack flex={1} testID="placeholder-screen">
      <AppBackground />
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <XStack alignItems="center" gap={12} paddingHorizontal={16} paddingVertical={8}>
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
            borderWidth={1}
            borderColor="$cardBorder"
            backgroundColor="$surface"
            pressStyle={PRESS_STYLE.control}
          >
            <MaterialIcons name="arrow-back" size={20} color={ink} />
          </XStack>
          <Text flex={1} fontSize={17} fontWeight="600" color="$color" numberOfLines={1}>
            {title}
          </Text>
        </XStack>

        {/* The header already names the screen, so the body is one icon and
            one line — the empty state of the calm design. */}
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          gap={16}
          paddingHorizontal={32}
        >
          <YStack
            width={96}
            height={96}
            borderRadius={48}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$surface"
          >
            <MaterialIcons name={icon} size={44} color={accent} />
          </YStack>
          <Text textAlign="center" fontSize={15} color="$muted">
            {subtitle ?? 'This space is coming soon.'}
          </Text>
        </YStack>
      </SafeAreaView>
    </YStack>
  );
}
