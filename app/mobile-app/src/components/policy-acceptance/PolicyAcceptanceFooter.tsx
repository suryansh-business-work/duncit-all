import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  done: number;
  total: number;
  canAcceptAll: boolean;
  onClose: () => void;
  /** Undefined while there is nothing left to accept. */
  onAcceptAll: (() => void) | undefined;
}

/** The sheet's foot: how many are accepted, Close, and "Accept all". */
export function PolicyAcceptanceFooter({
  done,
  total,
  canAcceptAll,
  onClose,
  onAcceptAll,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={10} paddingHorizontal={16} paddingTop={12}>
      <Text testID="policy-acceptance-count" fontSize={12.5} color="$muted">
        {t('policyAcceptance.acceptedCount', { vars: { done, total } })}
      </Text>
      <XStack gap={10}>
        <XStack
          testID="policy-acceptance-close"
          role="button"
          aria-label={t('policyAcceptance.close')}
          tabIndex={0}
          onPress={onClose}
          flex={1}
          height={48}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          backgroundColor="$surface"
          alignItems="center"
          justifyContent="center"
          pressStyle={PRESS_STYLE.control}
        >
          <Text fontSize={15} fontWeight="600" color="$color">
            {t('policyAcceptance.close')}
          </Text>
        </XStack>
        <XStack
          testID="policy-acceptance-accept-all"
          role="button"
          aria-label={t('policyAcceptance.acceptAll')}
          aria-disabled={!canAcceptAll}
          tabIndex={0}
          onPress={onAcceptAll}
          flex={1.4}
          height={48}
          borderRadius={999}
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
          opacity={canAcceptAll ? 1 : 0.5}
          pressStyle={PRESS_STYLE.solid}
        >
          <Text fontSize={15} fontWeight="600" color="$onPrimary">
            {t('policyAcceptance.acceptAll')}
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
