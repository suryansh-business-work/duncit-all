import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Profile → WhatsApp Preference. Tamagui twin of mWeb's
 * WhatsAppPreferenceCard, and the door next to Mail Preference: the two read as
 * one pair of choices, so they sit together rather than one on the account and
 * one buried elsewhere.
 */
export function WhatsAppPreferenceCard({ onPress }: Readonly<{ onPress: () => void }>) {
  const { t } = useTranslation();
  const { color, muted } = useThemeColors();

  return (
    <XStack
      testID="whatsapp-preference-card"
      role="button"
      aria-label={t('whatsappPreference.title')}
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
      <MaterialIcons name="chat" size={20} color={color} />
      <YStack flex={1}>
        <Text fontSize={14.5} fontWeight="700" color="$color">
          {t('whatsappPreference.title')}
        </Text>
        <Text fontSize={12.5} fontWeight="700" color="$muted">
          {t('whatsappPreference.entryHint')}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </XStack>
  );
}
