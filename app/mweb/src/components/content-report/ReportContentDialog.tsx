import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  firstGraphQLError,
  parseApiError,
  reportErrorKey,
  reportReasonNeedsDetails,
  reportSubmitError,
  REPORT_DIALOG_TITLE,
  type ReportCategoryOption,
  type ReportDialogKind,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { notify } from '../notify';
import ReportCategoryPicker from './ReportCategoryPicker';
import ReportPendingNotice from './ReportPendingNotice';
import { useMyOpenReport } from './useMyOpenReport';
import { REPORT_CATEGORIES, REPORT_MUTATION_OF } from './queries';

interface Props {
  /** The post, story or member being reported; null keeps the dialog closed. */
  targetId: string | null;
  /** What it is — picks the heading, and for a profile the mutation. */
  kind: ReportDialogKind;
  onClose: () => void;
}

interface CategoriesData {
  reportCategories: ReportCategoryOption[];
}

interface ReportReceipt {
  id: string;
  report_no: string;
}

interface ReportData {
  reportPost?: ReportReceipt;
  reportProfile?: ReportReceipt;
  reportChatMessage?: ReportReceipt;
}

/** The translation key for a refusal the server names by code, else null. */
const refusalKey = (error: unknown) => {
  const code = firstGraphQLError(error)?.extensions?.code;
  return reportErrorKey(typeof code === 'string' ? code : null);
};

/**
 * Report a post, a story or a profile to the Legal team. Native twin (rule 27).
 *
 * Open to ANY signed-in viewer — that is the whole point of it. The reasons
 * are not compiled in: they are the categories Legal manages in the Legal
 * portal (UGC Monitoring > Settings), read when the dialog opens. While the
 * viewer's earlier report on the same thing is still open the dialog shows
 * that instead of the form — the server refuses a repeat until Legal has
 * resolved the first, so tapping twice cannot manufacture a pile-on.
 */
export default function ReportContentDialog({ targetId, kind, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const open = !!targetId;
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const { checking, pending } = useMyOpenReport(targetId);
  const categories = useQuery<CategoriesData>(REPORT_CATEGORIES, {
    skip: !open,
    // Legal can change the list at any time; a cached copy would offer a
    // category that has since been switched off.
    fetchPolicy: 'cache-and-network',
  });
  const [report, { loading }] = useMutation<ReportData>(REPORT_MUTATION_OF[kind]);

  // Re-seed on every open: one dialog instance serves every post and story.
  useEffect(() => {
    if (!targetId) return;
    setReason('');
    setDetails('');
    setError('');
  }, [targetId]);

  const options = categories.data?.reportCategories ?? [];
  const picked = options.find((option) => option.key === reason) ?? null;
  const needsDetails = reportReasonNeedsDetails(picked);
  const showForm = !checking && !pending;

  const submit = async () => {
    const problem = reportSubmitError(picked, details);
    if (problem) {
      setError(t(problem));
      return;
    }
    try {
      const { data } = await report({ variables: { id: targetId, reason, details: details.trim() } });
      // The reference is the one the acknowledgement email carries.
      const ref = (data?.reportPost ?? data?.reportProfile ?? data?.reportChatMessage)?.report_no;
      notify(
        ref ? t('contentReport.submittedRef', { vars: { ref } }) : t('contentReport.submitted'),
        'success'
      );
      onClose();
    } catch (e) {
      const key = refusalKey(e);
      setError(key ? t(key) : parseApiError(e) || t('contentReport.submitFailed'));
    }
  };

  return (
    <Dialog
      data-testid="report-content-sheet"
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      aria-labelledby="report-content-title"
    >
      <DialogTitle id="report-content-title" sx={{ fontWeight: 600 }}>
        {t(REPORT_DIALOG_TITLE[kind])}
      </DialogTitle>
      <DialogContent dividers aria-busy={checking}>
        {checking && (
          <Stack data-testid="report-content-checking" sx={{ alignItems: 'center', py: 2 }}>
            <CircularProgress size={24} aria-label={t('contentReport.checkingEarlier')} />
          </Stack>
        )}
        {pending && <ReportPendingNotice reportNo={pending.report_no} />}
        {showForm && (
          <Stack spacing={1.5}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('contentReport.subtitle')}
            </Typography>
            <ReportCategoryPicker
              options={options}
              loading={categories.loading && options.length === 0}
              failed={!!categories.error && options.length === 0}
              value={reason}
              onChange={setReason}
              onRetry={() => categories.refetch()}
            />
            <TextField
              fullWidth
              multiline
              minRows={2}
              required={needsDetails}
              label={t('contentReport.detailsLabel')}
              placeholder={t('contentReport.detailsPlaceholder')}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              slotProps={{ htmlInput: { 'data-testid': 'report-content-details' } }}
            />
            {error && (
              <Alert data-testid="report-content-error" severity="error">
                {error}
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {pending ? (
          <DuncitButton data-testid="report-content-done" variant="contained" onClick={onClose}>
            {t('contentReport.done')}
          </DuncitButton>
        ) : (
          <>
            <DuncitButton data-testid="report-content-cancel" onClick={onClose}>
              {t('contentReport.cancel')}
            </DuncitButton>
            {/* The design system's primary CTA: a filled button in the brand
                colour. It was `color="error"`, which in dark mode is a pale
                pink fill with dark ink and read as disabled. */}
            <DuncitButton
              data-testid="report-content-submit"
              variant="contained"
              disabled={loading || !showForm}
              onClick={submit}
            >
              {t('contentReport.submit')}
            </DuncitButton>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
