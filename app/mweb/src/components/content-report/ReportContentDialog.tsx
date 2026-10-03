import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
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
  parseApiError,
  reportReasonNeedsDetails,
  reportSubmitError,
  REPORT_COPY,
  type ReportCategoryOption,
  type ReportableKind,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { notify } from '../notify';
import ReportCategoryPicker from './ReportCategoryPicker';
import { REPORT_CATEGORIES, REPORT_POST } from './queries';

interface Props {
  /** The post or story being reported; null keeps the dialog closed. */
  postId: string | null;
  /** Which of the two it is — only the wording differs. */
  kind: ReportableKind;
  onClose: () => void;
}

interface CategoriesData {
  reportCategories: ReportCategoryOption[];
}

interface ReportPostData {
  reportPost: { id: string; report_no: string };
}

/**
 * Report a post or a story to the Legal team. Native twin (rule 27).
 *
 * Open to ANY signed-in viewer — that is the whole point of it. The reasons
 * are not compiled in: they are the categories Legal manages in the Legal
 * portal (UGC Monitoring > Settings), read when the dialog opens. A repeat
 * report from the same person edits their existing one rather than filing a
 * second, so tapping it twice cannot be used to manufacture a pile-on.
 */
export default function ReportContentDialog({ postId, kind, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const open = !!postId;
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const categories = useQuery<CategoriesData>(REPORT_CATEGORIES, {
    skip: !open,
    // Legal can change the list at any time; a cached copy would offer a
    // category that has since been switched off.
    fetchPolicy: 'cache-and-network',
  });
  const [report, { loading }] = useMutation<ReportPostData>(REPORT_POST);

  // Re-seed on every open: one dialog instance serves every post and story.
  useEffect(() => {
    if (!postId) return;
    setReason('');
    setDetails('');
    setError('');
  }, [postId]);

  const options = categories.data?.reportCategories ?? [];
  const picked = options.find((option) => option.key === reason) ?? null;
  const needsDetails = reportReasonNeedsDetails(picked);

  const submit = async () => {
    const problem = reportSubmitError(picked, details);
    if (problem) {
      setError(t(problem));
      return;
    }
    try {
      const { data } = await report({ variables: { id: postId, reason, details: details.trim() } });
      // The reference is the one the acknowledgement email carries.
      const ref = data?.reportPost.report_no;
      notify(
        ref ? t('contentReport.submittedRef', { vars: { ref } }) : t('contentReport.submitted'),
        'success'
      );
      onClose();
    } catch (e) {
      setError(parseApiError(e) || t('contentReport.submitFailed'));
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
        {t(REPORT_COPY[kind].title)}
      </DialogTitle>
      <DialogContent dividers>
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
      </DialogContent>
      <DialogActions>
        <DuncitButton data-testid="report-content-cancel" onClick={onClose}>
          {t('contentReport.cancel')}
        </DuncitButton>
        <DuncitButton
          data-testid="report-content-submit"
          variant="contained"
          color="error"
          disabled={loading}
          onClick={submit}
        >
          {t('contentReport.submit')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
