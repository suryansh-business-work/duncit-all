import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import {
  parseApiError,
  REPORT_REASON_KEY,
  REPORT_STATUSES,
  REPORT_STATUS_KEY,
  REPORT_TARGET_KEY,
  type ReportStatus,
} from '@duncit/utils';
import { UPDATE_CONTENT_REPORT_STATUS, type ContentReport } from '../../graphql/reports';
import ReportPreview from './ReportPreview';

interface Props {
  report: ContentReport | null;
  formatDateTime: (value: Date) => string;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * One report, and the only two things staff can change about it.
 *
 * What the reporter wrote is shown but never editable — a report a reviewer can
 * rewrite is not a report. The status and the resolution note are the response,
 * and they live together because closing a report without saying what was done
 * is how a queue becomes untrustworthy.
 */
export default function ReportDetailDialog({
  report,
  formatDateTime,
  onClose,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ReportStatus>('RECEIVED');
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState('');
  const [save, { loading }] = useMutation(UPDATE_CONTENT_REPORT_STATUS);

  // Re-seed on every open: one dialog instance serves every row.
  useEffect(() => {
    if (!report) return;
    setStatus(report.status);
    setResolution(report.resolution ?? '');
    setError('');
  }, [report]);

  const apply = async () => {
    try {
      await save({ variables: { id: report?.id, input: { status, resolution } } });
      onSaved();
      onClose();
    } catch (e) {
      setError(parseApiError(e) || t('reportLogs.saveFailed'));
    }
  };

  const received = report?.created_at ? formatDateTime(new Date(report.created_at)) : '—';
  const subtitle = report ? `${t(REPORT_TARGET_KEY[report.target_type])} · ${received}` : '';

  return (
    <Dialog open={!!report} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        {t('reportLogs.detailTitle', { vars: { report_no: report?.report_no ?? '' } })}
        <Typography variant="caption" component="div" sx={{
          color: "text.secondary"
        }}>
          {subtitle}
        </Typography>
        <DuncitIconButton
          aria-label={t('reportLogs.detailClose')}
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </DuncitIconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <ReportPreview report={report} />
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 700
              }}>
              {t('reportLogs.colReason')}
            </Typography>
            <Typography variant="body2">
              {report ? t(REPORT_REASON_KEY[report.reason]) : ''}
            </Typography>
          </Box>
          <Box>
            <Typography
              variant="overline"
              sx={{
                color: "text.secondary",
                fontWeight: 700
              }}>
              {t('reportLogs.detailDetails')}
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {report?.details || t('reportLogs.detailNoDetails')}
            </Typography>
          </Box>
          <TextField
            select
            fullWidth
            label={t('reportLogs.detailStatus')}
            value={status}
            onChange={(e) => setStatus(e.target.value as ReportStatus)}
          >
            {REPORT_STATUSES.map((value) => (
              <MenuItem key={value} value={value}>
                {t(REPORT_STATUS_KEY[value])}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label={t('reportLogs.detailResolution')}
            placeholder={t('reportLogs.detailResolutionPlaceholder')}
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('reportLogs.detailClose')}</DuncitButton>
        <DuncitButton variant="contained" disabled={loading} onClick={apply}>
          {t('reportLogs.detailSave')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
