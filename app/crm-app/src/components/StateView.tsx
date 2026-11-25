import { Spinner, Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  loading?: boolean;
  /** A message to show with a retry; the generic one when `true`. */
  error?: string | boolean | null;
  /** Shown when there is nothing to list. */
  empty?: string | null;
  onRetry?: () => void;
}

/**
 * The loading, error and empty states every list and detail screen shares.
 * Renders nothing when none applies, so a screen can place it above its content.
 */
export function StateView({ loading, error, empty, onRetry }: Readonly<Props>) {
  const { t } = useTranslation();
  if (loading) {
    return (
      <YStack padding="$5" alignItems="center" gap="$2" aria-busy>
        <Spinner color="$accentText" />
        <Text color="$muted">{t('crmApp.common.loading')}</Text>
      </YStack>
    );
  }
  if (error) {
    return (
      <YStack padding="$5" alignItems="center" gap="$3" role="alert">
        <Text color="$danger" textAlign="center">
          {typeof error === 'string' ? error : t('crmApp.common.loadFailed')}
        </Text>
        {onRetry ? (
          <DuncitButton
            label={t('shell.common.retry')}
            onPress={onRetry}
            variant="outline"
            testID="state-retry"
          />
        ) : null}
      </YStack>
    );
  }
  if (empty) {
    return (
      <YStack padding="$5" alignItems="center">
        <Text color="$muted" textAlign="center">
          {empty}
        </Text>
      </YStack>
    );
  }
  return null;
}
