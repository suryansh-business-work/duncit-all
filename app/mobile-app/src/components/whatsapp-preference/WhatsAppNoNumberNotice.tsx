import { Text, XStack, YStack } from 'tamagui';

import { IconDisc } from '@/components/account/IconDisc';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/**
 * Shown when the account carries no sendable WhatsApp number. Tamagui twin of
 * mWeb's NoWhatsAppNumberCard — the switches below stay live on purpose, so
 * a preference can be set before the number exists rather than after the first
 * message has already arrived.
 */
export function WhatsAppNoNumberNotice({ onAddNumber }: Readonly<{ onAddNumber: () => void }>) {
  const { t } = useTranslation();

  return (
    <SurfaceCard testID="whatsapp-preference-no-number" flexDirection="row" gap={12}>
      <IconDisc icon="phonelink-erase" tone="muted" />
      <YStack flex={1} gap={4}>
        <Text fontSize={15} fontWeight="600" color="$color">
          {t('whatsappPreference.noNumberTitle')}
        </Text>
        <Text fontSize={14} color="$muted">
          {t('whatsappPreference.noNumberBody')}
        </Text>

        <XStack
          testID="whatsapp-preference-add-number"
          role="button"
          aria-label={t('whatsappPreference.addNumber')}
          onPress={onAddNumber}
          alignSelf="flex-start"
          marginTop={8}
          height={44}
          paddingHorizontal={18}
          alignItems="center"
          justifyContent="center"
          borderRadius={999}
          backgroundColor="$primary"
          pressStyle={PRESS_STYLE.solid}
        >
          <Text fontSize={14} fontWeight="600" color="$onPrimary">
            {t('whatsappPreference.addNumber')}
          </Text>
        </XStack>
      </YStack>
    </SurfaceCard>
  );
}
