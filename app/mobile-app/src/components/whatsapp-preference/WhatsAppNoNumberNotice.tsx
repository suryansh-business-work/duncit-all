import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Shown when the account carries no sendable WhatsApp number. Tamagui twin of
 * mWeb's WhatsAppNoNumberNotice — the switches below stay live on purpose, so
 * a preference can be set before the number exists rather than after the first
 * message has already arrived.
 */
export function WhatsAppNoNumberNotice({ onAddNumber }: Readonly<{ onAddNumber: () => void }>) {
  const { t } = useTranslation();
  const { danger, primary } = useThemeColors();

  return (
    <YStack
      testID="whatsapp-preference-no-number"
      borderRadius={18}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      padding={16}
      gap={4}
    >
      <XStack alignItems="center" gap={6}>
        <MaterialIcons name="error-outline" size={16} color={danger} />
        <Text fontSize={14} fontWeight="700" color="$color">
          {t('whatsappPreference.noNumberTitle')}
        </Text>
      </XStack>
      <Text fontSize={12.5} color="$muted">
        {t('whatsappPreference.noNumberBody')}
      </Text>

      <XStack
        testID="whatsapp-preference-add-number"
        role="button"
        aria-label={t('whatsappPreference.addNumber')}
        onPress={onAddNumber}
        marginTop={10}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        borderWidth={1}
        borderColor={primary}
        pressStyle={{ opacity: 0.85 }}
      >
        <Text fontSize={14} fontWeight="700" color={primary}>
          {t('whatsappPreference.addNumber')}
        </Text>
      </XStack>
    </YStack>
  );
}
