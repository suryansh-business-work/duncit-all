import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  parseApiError,
  reportReasonNeedsDetails,
  REPORT_REASONS,
  REPORT_REASON_KEY,
  type ReportReason,
} from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import { notify } from '../../components/notify';
import { REPORT_STORY } from '../ClubDetailsPage/clubDetailsQueries';

interface Props {
  /** The story being reported; null keeps the dialog closed. */
  storyId: string | null;
  onClose: () => void;
}

/**
 * Report a story to the Legal team. Native twin (rule 27).
 *
 * Open to ANY signed-in viewer — that is the whole point of it, and it is the
 * only thing in the story menu that is. A repeat report from the same person
 * edits their existing one rather than filing a second, so tapping it twice
 * cannot be used to manufacture a pile-on.
 */
export default function ReportStoryDialog({ storyId, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');
  const [report, { loading }] = useMutation(REPORT_STORY);

  // Re-seed on every open: one dialog instance serves every story.
  useEffect(() => {
    if (!storyId) return;
    setReason(null);
    setDetails('');
    setError('');
  }, [storyId]);

  const needsDetails = reportReasonNeedsDetails(reason);

  const submit = async () => {
    if (!reason) {
      setError(t('contentReport.reasonRequired'));
      return;
    }
    if (needsDetails && !details.trim()) {
      setError(t('contentReport.detailsRequired'));
      return;
    }
    try {
      await report({ variables: { id: storyId, reason, details: details.trim() } });
      notify(t('contentReport.submitted'), 'success');
      onClose();
    } catch (e) {
      setError(parseApiError(e) || t('contentReport.submitFailed'));
    }
  };

  return (
    <Dialog open={!!storyId} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700 }}>{t('contentReport.title')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {t('contentReport.subtitle')}
          </Typography>
          <Typography variant="overline" color="text.secondary" fontWeight={700}>
            {t('contentReport.reasonLabel')}
          </Typography>
          <RadioGroup
            value={reason ?? ''}
            onChange={(e) => setReason(e.target.value as ReportReason)}
          >
            {REPORT_REASONS.map((value) => (
              <FormControlLabel
                key={value}
                value={value}
                control={<Radio size="small" />}
                label={t(REPORT_REASON_KEY[value])}
              />
            ))}
          </RadioGroup>
          <TextField
            fullWidth
            multiline
            minRows={2}
            required={needsDetails}
            label={t('contentReport.detailsLabel')}
            placeholder={t('contentReport.detailsPlaceholder')}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('contentReport.cancel')}</Button>
        <Button variant="contained" color="error" disabled={loading} onClick={submit}>
          {t('contentReport.submit')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
