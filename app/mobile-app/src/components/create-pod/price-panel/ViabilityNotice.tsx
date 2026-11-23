import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { formatStatementMoney, MWEB_POD_VIABILITY_KEYS, podViabilityNotice } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { withAlpha } from '@/constants/survey-palette';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { PodPricingState } from './usePodPricing';

interface Props {
  pricing: PodPricingState;
  /** The finance settings' currency symbol, for the amounts in the copy. */
  currencySymbol: string;
}

/**
 * Under the Ticket Price field: why Create Pod is off when the server's verdict
 * says this paid pod would be refused (the reason, the venue's minimum business
 * and the lowest ticket price that works), or that the check itself failed,
 * with a retry. A polite live region that is always mounted, so a screen
 * reader hears each new verdict as the price changes. The tints are the
 * theme's `warning` / `danger` at low alpha. mWeb twin (rule 27).
 */
export function ViabilityNotice({ pricing, currencySymbol }: Readonly<Props>) {
  const { warning, danger } = useThemeColors();
  const { t } = useTranslation();
  const money = (rupees: number) => formatStatementMoney(rupees, currencySymbol);
  const notice = pricing.notViable
    ? podViabilityNotice(pricing.projection, MWEB_POD_VIABILITY_KEYS, t, money)
    : null;

  return (
    <YStack aria-live="polite" testID="create-pod-viability">
      {pricing.failed ? (
        <XStack
          testID="create-pod-viability-failed"
          gap={10}
          alignItems="flex-start"
          backgroundColor={withAlpha(danger, 0.12)}
          borderRadius={16}
          padding={12}
        >
          <MaterialIcons name="error-outline" size={18} color={danger} />
          <YStack flex={1} gap={8} alignItems="flex-start">
            <Text fontSize={12} color="$color">
              {t('mweb.createPod.viability.checkFailed')}
            </Text>
            <DuncitButton
              testID="create-pod-viability-retry"
              label={t('mweb.createPod.viability.retry')}
              onPress={pricing.retry}
              variant="outline"
              tone="neutral"
              size="sm"
            />
          </YStack>
        </XStack>
      ) : null}
      {notice ? (
        <XStack
          testID="create-pod-viability-notice"
          gap={10}
          alignItems="flex-start"
          backgroundColor={withAlpha(warning, 0.12)}
          borderRadius={16}
          padding={12}
        >
          <MaterialIcons name="info-outline" size={18} color={warning} />
          <YStack flex={1} gap={2}>
            <Text fontSize={14} fontWeight="600" color="$color">
              {notice.title}
            </Text>
            <Text fontSize={12} color="$muted">
              {notice.body}
            </Text>
          </YStack>
        </XStack>
      ) : null}
    </YStack>
  );
}
