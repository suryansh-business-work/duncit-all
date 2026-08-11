import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Profile → Mail Preference. Tamagui twin of mWeb's MailPreferenceCard: a door
 * rather than the controls themselves, because nine categories with a sentence
 * each would push the account's own information off the first screen.
 */
export function MailPreferenceCard({ onPress }: Readonly<{ onPress: () => void }>) {
  const { t } = useTranslation();
  const { color, muted } = useThemeColors();

  return (
    <XStack
      testID="mail-preference-card"
      role="button"
      aria-label={t('mailPreference.title')}
      onPress={onPress}
      paddingHorizontal={16}
      paddingVertical={14}
      borderRadius={18}
      alignItems="center"
      gap={12}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name="mark-email-read" size={20} color={color} />
      <YStack flex={1}>
        <Text fontSize={14.5} fontWeight="700" color="$color">
          {t('mailPreference.title')}
        </Text>
        <Text fontSize={12.5} fontWeight="700" color="$muted">
          {t('mailPreference.entryHint')}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </XStack>
  );
}
