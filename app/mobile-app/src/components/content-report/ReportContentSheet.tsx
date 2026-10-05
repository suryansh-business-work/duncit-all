import { useEffect, useState } from 'react';
import { Button, Spinner, Text, TextArea, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { ReportCategoryList } from '@/components/content-report/ReportCategoryList';
import { ReportReceivedNotice } from '@/components/content-report/ReportReceivedNotice';
import { reportPost, reportProfile, useReportCategories } from '@/hooks/useReportContent';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import {
  parseApiError,
  reportSubmitError,
  REPORT_DIALOG_TITLE,
  type ReportDialogKind,
} from '@duncit/utils';

interface Props {
  /** The post, story or member being reported; null keeps the sheet closed. */
  targetId: string | null;
  /** What it is — picks the heading, and for a profile the mutation. */
  kind: ReportDialogKind;
  onClose: () => void;
  onReported?: () => void;
}

/**
 * Report a post, a story or a profile to the Legal team. mWeb twin: ReportContentDialog
 * (rule 27).
 *
 * Open to ANY signed-in viewer — that is the whole point of it. The reasons
 * are not compiled in: they are the categories Legal manages in the Legal
 * portal (UGC Monitoring > Settings), read when the sheet opens. A repeat
 * report from the same person edits their existing one rather than filing a
 * second, so tapping it twice cannot be used to manufacture a pile-on.
 */
export function ReportContentSheet({ targetId, kind, onClose, onReported }: Readonly<Props>) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // The landed report's reference; set, the sheet turns into its confirmation.
  const [receipt, setReceipt] = useState<string | null>(null);
  const { categories, isLoading, failed, retry } = useReportCategories(!!targetId);

  // Re-seed on every open: one sheet instance serves every post and story.
  useEffect(() => {
    if (!targetId) return;
    setReason('');
    setDetails('');
    setError('');
    setReceipt(null);
  }, [targetId]);

  const picked = categories.find((option) => option.key === reason) ?? null;

  const submit = async () => {
    if (!targetId) return;
    const problem = reportSubmitError(picked, details);
    if (problem) {
      setError(t(problem));
      return;
    }
    setBusy(true);
    try {
      const send = kind === 'PROFILE' ? reportProfile : reportPost;
      setReceipt(await send(targetId, reason, details.trim()));
      onReported?.();
    } catch (e) {
      setError(parseApiError(e) || t('contentReport.submitFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DuncitDialog
      open={!!targetId}
      onClose={onClose}
      testID="report-content-sheet"
      title={t(REPORT_DIALOG_TITLE[kind])}
      subtitle={receipt === null ? t('contentReport.subtitle') : undefined}
      closeLabel={t('contentReport.cancel')}
      dismissOnBackdrop={!busy}
      footer={
        receipt !== null ? (
          <Button testID="report-content-done" theme="red" onPress={onClose}>
            {t('contentReport.done')}
          </Button>
        ) : (
          <Button
            testID="report-content-submit"
            theme="red"
            disabled={busy}
            aria-busy={busy}
            aria-label={busy ? t('contentReport.sending') : undefined}
            icon={busy ? <Spinner testID="report-content-spinner" color="$color" /> : undefined}
            onPress={() => fireAndForget(submit())}
          >
            {t('contentReport.submit')}
          </Button>
        )
      }
    >
      {receipt !== null ? (
        <ReportReceivedNotice reportNo={receipt} />
      ) : (
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
      )}
    </DuncitDialog>
  );
}
