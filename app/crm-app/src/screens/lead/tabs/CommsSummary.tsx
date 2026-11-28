import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { CRM_CALL_SENTIMENT } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { ToneChip } from '@/components/ToneChip';
import { RADII } from '@/constants/design';
import { useTranslation } from '@/hooks/useTranslation';
import { TabAlert } from './TabAlert';

export interface CallSummaryView {
  status: string;
  text: string;
  key_points: readonly string[];
  follow_ups: readonly string[];
  sentiment?: string | null;
  outcome?: string | null;
  reminder_id?: string | null;
  error?: string | null;
}

interface Props {
  summary: CallSummaryView | null | undefined;
  /** A transcript exists, so a summary can be generated. */
  canSummarize: boolean;
  busy: boolean;
  onSummarize: () => void;
}

function Points({ title, items }: Readonly<{ title: string; items: readonly string[] }>) {
  const theme = useTheme();
  if (items.length === 0) return null;
  return (
    <YStack gap="$1">
      <Text color="$muted" fontSize="$2" fontWeight="700">
        {title}
      </Text>
      {items.map((item) => (
        <XStack key={item} gap="$2" alignItems="center">
          <MaterialIcons
            name="fiber-manual-record"
            size={8}
            color={theme.muted?.val}
            accessibilityElementsHidden
          />
          <Text flex={1}>{item}</Text>
        </XStack>
      ))}
    </YStack>
  );
}

/** Generate (or Retry after a failure) — shown once a call has a transcript but no summary yet. */
function SummaryAction({
  failed,
  error,
  onSummarize,
}: Readonly<{ failed: boolean; error?: string | null; onSummarize: () => void }>) {
  const { t } = useTranslation();
  return (
    <YStack gap="$2" alignItems="flex-start">
      {failed ? (
        <TabAlert tone="warning">
          {error ? `${t('crm.call.summaryFailed')} · ${error}` : t('crm.call.summaryFailed')}
        </TabAlert>
      ) : null}
      <DuncitButton
        label={failed ? t('crm.call.retrySummary') : t('crm.call.generateSummary')}
        onPress={onSummarize}
        variant="outline"
        size="sm"
        testID="comm-summarize"
      />
    </YStack>
  );
}

/**
 * The AI read of a call: summary, sentiment, outcome, key points and
 * follow-ups, with whether a follow-up reminder was created — the portal's
 * call summary card, generated (or regenerated) on demand.
 */
export function CommsSummary({ summary, canSummarize, busy, onSummarize }: Readonly<Props>) {
  const { t } = useTranslation();
  const theme = useTheme();
  const status = summary?.status ?? 'NONE';
  if (status === 'PENDING' || busy) {
    return (
      <XStack gap="$2" alignItems="center" role="status" aria-live="polite">
        <Spinner size="small" color="$accentText" />
        <Text color="$muted">{t('crm.call.summaryPending')}</Text>
      </XStack>
    );
  }
  if (status !== 'READY' || !summary) {
    if (!canSummarize) return null;
    return (
      <SummaryAction
        failed={status === 'FAILED'}
        error={summary?.error}
        onSummarize={onSummarize}
      />
    );
  }
  const sentiment = summary.sentiment ? CRM_CALL_SENTIMENT[summary.sentiment] : undefined;
  return (
    <YStack
      gap="$2"
      padding="$3"
      borderRadius={RADII.sm}
      backgroundColor="$soft"
      testID="call-summary"
    >
      <XStack gap="$2" alignItems="center" flexWrap="wrap">
        <MaterialIcons
          name="auto-awesome"
          size={18}
          color={theme.accentText?.val}
          accessibilityElementsHidden
        />
        <Text fontWeight="700" flex={1}>
          {t('crm.call.summaryTitle')}
        </Text>
        {sentiment ? <ToneChip label={t(sentiment.labelKey)} tone={sentiment.tone} /> : null}
        {summary.reminder_id ? (
          <ToneChip label={t('crm.call.reminderCreated')} tone="info" />
        ) : null}
      </XStack>
      <Text>{summary.text}</Text>
      {summary.outcome ? <Text>{`${t('crm.call.outcome')}: ${summary.outcome}`}</Text> : null}
      <Points title={t('crm.call.keyPoints')} items={summary.key_points} />
      <Points title={t('crm.call.followUps')} items={summary.follow_ups} />
      <XStack>
        <DuncitButton
          label={t('crm.call.retrySummary')}
          onPress={onSummarize}
          variant="ghost"
          size="sm"
          testID="comm-resummarize"
        />
      </XStack>
    </YStack>
  );
}
