import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import { Text, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

/** Top banner of the waiting screen — big yellow tick, heading + subheading,
 * top-center aligned. mWeb twin (rule 27). */
export function PendingBanner() {
  const { t } = useTranslation();
  return (
    <YStack testID="pod-pending-banner" alignItems="center" gap={10} paddingVertical={16}>
      <MaterialIcons name="check-circle" size={64} color={semantic.warning} />
      <Text fontSize={17} fontWeight="700" color="$color" textAlign="center">
        {t('mweb.podPending.bannerTitle')}
      </Text>
      <Text fontSize={13} color="$muted" textAlign="center">
        {t('mweb.podPending.bannerBody')}
      </Text>
    </YStack>
  );
}
