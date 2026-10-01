import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Chip,
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
  REPORT_STATUSES,
  REPORT_STATUS_KEY,
  REPORT_TARGET_KEY,
  type ReportStatus,
} from '@duncit/utils';
import { UPDATE_CONTENT_REPORT_STATUS, type ContentReport } from '../../../graphql/reports';
import { contentStateKey } from './contentState';
import ReportFact from './ReportFact';
import ReportHistory from './ReportHistory';
import ReportPreview from './ReportPreview';
import ReportRowActions, { type ReportActionHandlers } from './ReportRowActions';

interface Props {
  report: ContentReport | null;
  formatDateTime: (value: Date) => string;
  /** The same four actions the row offers, so a reviewer can act from here. */
  handlers: ReportActionHandlers;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * One report: what was reported, what was said about it, what was done.
 *
 * What the reporter wrote is shown but never editable — a report a reviewer can
 * rewrite is not a report. The status and the resolution note are the response,
 * and they live together because closing a report without saying what was done
 * is how a queue becomes untrustworthy. The verdicts themselves (take down,
 * looks good) and the two mails are the buttons at the top; each one is logged
 * in the activity list at the bottom.
 */
export default function ReportDetailDialog({
  report,
  formatDateTime,
  handlers,
  onClose,
  onSaved,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ReportStatus>('RECEIVED');
  const [resolution, setResolution] = useState('');
  const [error, setError] = useState('');
  const [save, { loading }] = useMutation<any>(UPDATE_CONTENT_REPORT_STATUS);

  // Re-seed on every open: one dialog instance serves every row.
  useEffect(() => {
    if (!report) return;
    setStatus(report.status);
    setResolution(report.resolution);
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
    <Dialog data-testid="report-detail-dialog" open={!!report} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        {t('reportLogs.detailTitle', { vars: { report_no: report?.report_no ?? '' } })}
        <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
        <DuncitIconButton
          data-testid="report-detail-close"
          aria-label={t('reportLogs.detailClose')}
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </DuncitIconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {report && (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
              <Chip
                data-testid="report-detail-content-state"
                size="small"
                variant={report.target_live ? 'filled' : 'outlined'}
                color={report.target_live ? 'warning' : 'default'}
                label={t(contentStateKey(report))}
              />
              <Typography variant="caption" sx={{ color: 'text.secondary', flex: 1 }}>
                {t('reportLogs.detailReportCount', { vars: { count: report.report_count } })}
              </Typography>
              <ReportRowActions report={report} handlers={handlers} />
            </Stack>
          )}
          <ReportPreview report={report} />
          <ReportFact label={t('reportLogs.colReason')} value={report?.reason_label ?? ''} />
          <ReportFact
            label={t('reportLogs.detailDetails')}
            value={report?.details || t('reportLogs.detailNoDetails')}
          />
          <TextField
            select
            fullWidth
            label={t('reportLogs.detailStatus')}
            value={status}
            onChange={(e) => setStatus(e.target.value as ReportStatus)}
            slotProps={{ htmlInput: { 'data-testid': 'report-detail-status' } }}
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
            slotProps={{ htmlInput: { 'data-testid': 'report-detail-resolution' } }}
          />
          {error && (
            <Alert data-testid="report-detail-error" severity="error">
              {error}
            </Alert>
          )}
          <ReportHistory history={report?.history ?? []} formatDateTime={formatDateTime} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton data-testid="report-detail-cancel" onClick={onClose}>
          {t('reportLogs.detailClose')}
        </DuncitButton>
        <DuncitButton data-testid="report-detail-save" variant="contained" disabled={loading} onClick={apply}>
          {t('reportLogs.detailSave')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
