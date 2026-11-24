import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack, useTheme } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  reference?: string;
  onRetry: () => void;
  onReport: () => Promise<void>;
}

type ReportStatus = 'idle' | 'sending' | 'sent' | 'failed';

/** What a broken screen shows: what happened, Retry, Report an Issue, and the reference support asks for. */
export function ErrorPanel({ reference, onRetry, onReport }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [status, setStatus] = useState<ReportStatus>('idle');

  const report = async () => {
    setStatus('sending');
    try {
      await onReport();
      setStatus('sent');
    } catch {
      setStatus('failed');
    }
  };

  let outcome = '';
  if (status === 'sent') outcome = t('ui.errorBoundary.reported');
  else if (status === 'failed') outcome = t('ui.errorBoundary.reportFailed');

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" padding="$5" backgroundColor="$background" role="alert">
      <MaterialIcons name="error-outline" size={48} color={theme.danger?.val} accessibilityElementsHidden />
      <Text fontSize="$7" fontWeight="700" textAlign="center" role="heading">
        {t('ui.errorBoundary.title')}
      </Text>
      <Text color="$muted" textAlign="center">
        {t('ui.errorBoundary.body')}
      </Text>
      <DuncitButton label={t('ui.errorBoundary.retry')} onPress={onRetry} fullWidth testID="error-retry" />
      {status !== 'sent' && (
        <DuncitButton
          label={status === 'sending' ? t('ui.errorBoundary.reporting') : t('ui.errorBoundary.report')}
          onPress={report}
          variant="outline"
          loading={status === 'sending'}
          fullWidth
          testID="error-report"
        />
      )}
      {outcome ? (
        <Text color="$muted" aria-live="polite">
          {outcome}
        </Text>
      ) : null}
      {reference ? (
        <Text color="$muted" fontSize="$2" selectable>
          {t('ui.errorBoundary.reference', { vars: { id: reference } })}
        </Text>
      ) : null}
    </YStack>
  );
}
