import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { semantic } from '@duncit/auth-tokens';
import { Text, YStack } from 'tamagui';
import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

type ReportStatus = 'idle' | 'sending' | 'sent' | 'failed';

/**
 * What a crashed screen shows instead of itself — the Tamagui twin of
 * @duncit/ui's ErrorFallback, with the same `ui.errorBoundary.*` words.
 * A function component because the boundary is a class and a class cannot
 * call `useTranslation`. Says what happened and what to do, never the error.
 */
export function ErrorPanel({
  reference,
  onRetry,
  onReport,
}: Readonly<{ reference?: string; onRetry: () => void; onReport: () => Promise<void> }>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ReportStatus>('idle');
  const title = t('ui.errorBoundary.title');

  // It replaces whatever screen was open without moving focus, so it
  // speaks up: an alert on web, an announcement on native (WCAG 4.1.3).
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(title);
  }, [title]);

  const report = () => {
    setStatus('sending');
    onReport().then(
      () => setStatus('sent'),
      () => setStatus('failed'),
    );
  };

  let outcome: string | null = null;
  if (status === 'sent') outcome = t('ui.errorBoundary.reported');
  else if (status === 'failed') outcome = t('ui.errorBoundary.reportFailed');

  return (
    <YStack
      testID="error-boundary-fallback"
      flex={1}
      alignItems="center"
      justifyContent="center"
      gap={16}
      padding={24}
      backgroundColor="$background"
    >
      <MaterialIcons name="error-outline" size={48} color={semantic.error} />
      <Text
        testID="error-boundary-title"
        role="alert"
        fontSize={20}
        fontWeight="600"
        color="$color"
        textAlign="center"
      >
        {title}
      </Text>
      <Text fontSize={14} color="$muted" textAlign="center">
        {t('ui.errorBoundary.body')}
      </Text>
      <YStack gap={12} alignSelf="stretch">
        <DuncitButton
          testID="error-boundary-retry"
          label={t('ui.errorBoundary.retry')}
          onPress={onRetry}
          size="lg"
        />
        {status === 'sent' ? null : (
          <DuncitButton
            testID="error-boundary-report"
            variant="outline"
            label={
              status === 'sending' ? t('ui.errorBoundary.reporting') : t('ui.errorBoundary.report')
            }
            loading={status === 'sending'}
            onPress={report}
            size="lg"
          />
        )}
      </YStack>
      {outcome ? (
        <Text role="status" fontSize={14} color="$color" textAlign="center">
          {outcome}
        </Text>
      ) : null}
      {reference ? (
        <Text fontSize={12} color="$muted" textAlign="center">
          {t('ui.errorBoundary.reference', { vars: { id: reference } })}
        </Text>
      ) : null}
    </YStack>
  );
}
