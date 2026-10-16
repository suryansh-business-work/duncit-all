import { useEffect, useState } from 'react';
import { Spinner, Text, TextArea, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { ReportCategoryList } from '@/components/content-report/ReportCategoryList';
import { ReportPendingNotice } from '@/components/content-report/ReportPendingNotice';
import { ReportReceivedNotice } from '@/components/content-report/ReportReceivedNotice';
import {
  reportPost,
  reportProfile,
  reportChatMessage,
  useMyOpenReport,
  useReportCategories,
} from '@/hooks/useReportContent';
import { useTranslation } from '@/hooks/useTranslation';
import { errorCode } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';
import {
  parseApiError,
  reportErrorKey,
  reportSubmitError,
  REPORT_DIALOG_TITLE,
  type ReportDialogKind,
} from '@duncit/utils';

/** The request each kind files through; posts and stories share one. */
const SEND_OF: Record<ReportDialogKind, typeof reportPost> = {
  STORY: reportPost,
  POST: reportPost,
  PROFILE: reportProfile,
  MESSAGE: reportChatMessage,
};

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
 * portal (UGC Monitoring > Settings), read when the sheet opens. While the
 * viewer's earlier report on the same thing is still open the sheet shows that
 * instead of the form — the server refuses a repeat until Legal has resolved
 * the first, so tapping twice cannot manufacture a pile-on.
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
  const { checking, pending } = useMyOpenReport(targetId);

  // Re-seed on every open: one sheet instance serves every post and story.
  useEffect(() => {
    if (!targetId) return;
    setReason('');
    setDetails('');
    setError('');
    setReceipt(null);
  }, [targetId]);

  const picked = categories.find((option) => option.key === reason) ?? null;
  const showForm = receipt === null && !pending && !checking;

  const submit = async () => {
    /* istanbul ignore next -- TS narrowing guard: the submit button only mounts while targetId is set (the dialog is closed otherwise) */
    if (!targetId) return;
    const problem = reportSubmitError(picked, details);
    if (problem) {
      setError(t(problem));
      return;
    }
    setBusy(true);
    try {
      const send = SEND_OF[kind];
      setReceipt(await send(targetId, reason, details.trim()));
      onReported?.();
    } catch (e) {
      const key = reportErrorKey(errorCode(e));
      setError(key ? t(key) : parseApiError(e) || t('contentReport.submitFailed'));
    } finally {
      setBusy(false);
    }
  };

  // Filled primary buttons from the design system (DuncitButton solid), not
  // Tamagui's `theme="red"` sub-theme, which painted a pale pink fill with
  // dark ink and read as disabled while it was not.
  const footer =
    receipt !== null || pending ? (
      <DuncitButton
        testID="report-content-done"
        label={t('contentReport.done')}
        fullWidth
        onPress={onClose}
      />
    ) : (
      <DuncitButton
        testID="report-content-submit"
        label={t('contentReport.submit')}
        accessibilityLabel={busy ? t('contentReport.sending') : undefined}
        fullWidth
        loading={busy}
        disabled={checking}
        onPress={() => fireAndForget(submit())}
      />
    );

  return (
    <DuncitDialog
      open={!!targetId}
      onClose={onClose}
      testID="report-content-sheet"
      title={t(REPORT_DIALOG_TITLE[kind])}
      subtitle={showForm ? t('contentReport.subtitle') : undefined}
      closeLabel={t('contentReport.cancel')}
      dismissOnBackdrop={!busy}
      footer={footer}
    >
      {checking ? (
        <YStack testID="report-content-checking" alignItems="center" paddingVertical={16}>
          <Spinner aria-label={t('contentReport.checkingEarlier')} color="$primary" />
        </YStack>
      ) : null}
      {receipt === null && pending ? <ReportPendingNotice reportNo={pending.report_no} /> : null}
      {receipt === null ? null : <ReportReceivedNotice reportNo={receipt} />}
      {showForm ? (
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
      ) : null}
    </DuncitDialog>
  );
}
