import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Text, TextArea, XStack, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { ContentReportReasonOptionsDocument, ReportStoryDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import {
  parseApiError,
  reportReasonNeedsDetails,
  type ReportReasonOption,
  type ReportReason,
} from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  /** The story being reported; null keeps the sheet closed. */
  storyId: string | null;
  onClose: () => void;
  onReported?: () => void;
}

/**
 * Report a story to the Legal team. mWeb twin (rule 27).
 *
 * Open to ANY signed-in viewer — that is the whole point of it, and it is the
 * only thing in the story menu that is. A repeat report from the same person
 * edits their existing one rather than filing a second, so tapping it twice
 * cannot be used to manufacture a pile-on.
 */
export function ReportStorySheet({ storyId, onClose, onReported }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color, primary } = useThemeColors();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState<ReportReasonOption[]>([]);

  // Re-seed on every open: one sheet instance serves every story.
  useEffect(() => {
    if (!storyId) return;
    setReason(null);
    setDetails('');
    setError('');
  }, [storyId]);

  useEffect(() => {
    graphqlRequest(ContentReportReasonOptionsDocument, {}, { auth: true })
      .then((result) => setReasons(result.contentReportReasonOptions))
      .catch((reasonError: unknown) => setError(parseApiError(reasonError) || t('contentReport.submitFailed')));
  }, [t]);

  const submit = async () => {
    if (!reason) {
      setError(t('contentReport.reasonRequired'));
      return;
    }
    if (reportReasonNeedsDetails(reason) && !details.trim()) {
      setError(t('contentReport.detailsRequired'));
      return;
    }
    setBusy(true);
    try {
      await graphqlRequest(
        ReportStoryDocument,
        { id: storyId as string, reason, details: details.trim() },
        { auth: true },
      );
      onReported?.();
      onClose();
    } catch (e) {
      setError(parseApiError(e) || t('contentReport.submitFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DuncitDialog
      open={!!storyId}
      onClose={onClose}
      testID="report-story-sheet"
      title={t('contentReport.title')}
      subtitle={t('contentReport.subtitle')}
      closeLabel={t('contentReport.cancel')}
      footer={
        <Button testID="report-story-submit" theme="red" disabled={busy} onPress={submit}>
          {t('contentReport.submit')}
        </Button>
      }
    >
      <YStack gap={10}>
        <Text fontSize={12} fontWeight="600" color="$muted">
          {t('contentReport.reasonLabel')}
        </Text>
        {reasons.map(({ id, label }) => (
          <XStack
            key={id}
            testID={`report-reason-${id}`}
            role="radio"
            aria-checked={reason === id}
            tabIndex={0}
            aria-label={label}
            onPress={() => setReason(id)}
            alignItems="center"
            gap={10}
            paddingVertical={8}
            pressStyle={PRESS_STYLE.row}
          >
            <MaterialIcons
              name={reason === id ? 'radio-button-checked' : 'radio-button-unchecked'}
              size={20}
              color={reason === id ? primary : color}
            />
            <Text fontSize={14} color="$color">
              {label}
            </Text>
          </XStack>
        ))}
        <Text fontSize={12} fontWeight="600" color="$muted">
          {t('contentReport.detailsLabel')}
        </Text>
        <TextArea
          testID="report-story-details"
          value={details}
          onChangeText={setDetails}
          placeholder={t('contentReport.detailsPlaceholder')}
          placeholderTextColor="$muted"
          minHeight={80}
        />
        {error ? (
          <Text testID="report-story-error" fontSize={12} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
