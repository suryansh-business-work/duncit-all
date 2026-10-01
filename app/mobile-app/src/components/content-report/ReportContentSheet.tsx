import { useEffect, useState } from 'react';
import { Button, Text, TextArea, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { ReportCategoryList } from '@/components/content-report/ReportCategoryList';
import { reportPost, useReportCategories } from '@/hooks/useReportContent';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { parseApiError, reportSubmitError, REPORT_COPY, type ReportableKind } from '@duncit/utils';

interface Props {
  /** The post or story being reported; null keeps the sheet closed. */
  postId: string | null;
  /** Which of the two it is — only the wording differs. */
  kind: ReportableKind;
  onClose: () => void;
  onReported?: () => void;
}

/**
 * Report a post or a story to the Legal team. mWeb twin: ReportContentDialog
 * (rule 27).
 *
 * Open to ANY signed-in viewer — that is the whole point of it. The reasons
 * are not compiled in: they are the categories Legal manages in the Legal
 * portal (UGC Monitoring > Settings), read when the sheet opens. A repeat
 * report from the same person edits their existing one rather than filing a
 * second, so tapping it twice cannot be used to manufacture a pile-on.
 */
export function ReportContentSheet({ postId, kind, onClose, onReported }: Readonly<Props>) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { categories, isLoading, failed, retry } = useReportCategories(!!postId);

  // Re-seed on every open: one sheet instance serves every post and story.
  useEffect(() => {
    if (!postId) return;
    setReason('');
    setDetails('');
    setError('');
  }, [postId]);

  const picked = categories.find((option) => option.key === reason) ?? null;

  const submit = async () => {
    if (!postId) return;
    const problem = reportSubmitError(picked, details);
    if (problem) {
      setError(t(problem));
      return;
    }
    setBusy(true);
    try {
      await reportPost(postId, reason, details.trim());
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
      open={!!postId}
      onClose={onClose}
      testID="report-content-sheet"
      title={t(REPORT_COPY[kind].title)}
      subtitle={t('contentReport.subtitle')}
      closeLabel={t('contentReport.cancel')}
      footer={
        <Button
          testID="report-content-submit"
          theme="red"
          disabled={busy}
          onPress={() => fireAndForget(submit())}
        >
          {t('contentReport.submit')}
        </Button>
      }
    >
      <YStack gap={10}>
        <ReportCategoryList
          options={categories}
          loading={isLoading && categories.length === 0}
          failed={failed && categories.length === 0}
          value={reason}
          onChange={setReason}
          onRetry={retry}
        />
        <Text fontSize={12} fontWeight="600" color="$muted">
          {t('contentReport.detailsLabel')}
        </Text>
        <TextArea
          testID="report-content-details"
          aria-label={t('contentReport.detailsLabel')}
          value={details}
          onChangeText={setDetails}
          placeholder={t('contentReport.detailsPlaceholder')}
          placeholderTextColor="$muted"
          minHeight={80}
        />
        {error ? (
          <Text testID="report-content-error" role="alert" fontSize={12} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
