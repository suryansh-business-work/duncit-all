import { useEffect, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { DetailBlock as Mono, DetailField as Field } from '../../components/DetailField';
import {
  DELETE_STATUS_REPORTS,
  IMPACT_COLOR,
  STATUS_COLOR,
  UPDATE_STATUS_REPORT,
  impactLabel,
  statusLabel,
  statusOptions,
  type StatusReportRow,
  type StatusReportStatus,
} from './queries';

interface Props {
  row: StatusReportRow | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Everything one reported problem knows about itself, plus its triage. */
export default function StatusReportDetailDialog({ row, onClose, onSaved }: Readonly<Props>) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StatusReportStatus>('NEW');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [update] = useMutation(UPDATE_STATUS_REPORT);
  const [removeReports] = useMutation<{ deleteStatusReports: number }>(DELETE_STATUS_REPORTS);
  const confirm = useConfirm();

  // Re-seeded per row: the dialog is one instance reused for every report, so
  // without this it would open on the previous row's triage.
  useEffect(() => {
    if (!row) return;
    setStatus(row.status);
    setNote(row.note);
  }, [row]);

  if (!row) return null;

  const save = async () => {
    setSaving(true);
    try {
      await update({ variables: { report_id: row.id, status, note } });
      notifySuccess(t('tech.statusReports.saved'));
      onSaved();
      onClose();
    } catch (error) {
      notifyError(error instanceof Error ? error.message : t('tech.statusReports.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: t('tech.statusReports.deleteThisReport'),
      message: t('tech.statusReports.deleteWarning'),
      confirmLabel: t('shell.common.delete'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await removeReports({ variables: { ids: [row.id] } });
      notifySuccess(t('tech.statusReports.deleted'));
      onSaved();
      onClose();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle component="div">
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip size="small" color={STATUS_COLOR[row.status]} label={statusLabel(t, row.status)} />
          <Chip
            size="small"
            variant="outlined"
            color={IMPACT_COLOR[row.impact]}
            label={impactLabel(t, row.impact)}
          />
          <Box component="span" sx={{ fontWeight: 700 }}>
            {row.service_name || t('tech.statusReports.unspecifiedService')}
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Field label={t('tech.common.when')} value={formatDateTime(row.created_at)} />
            <Field label={t('tech.common.env')} value={row.environment} />
            <Field label={t('tech.statusReports.reporter')} value={row.name} />
            <Field label={t('shell.common.email')} value={row.email} />
            <Field label={t('tech.statusReports.pageAddress')} value={row.page_url} />
            <Field
              label={t('tech.statusReports.signedInAccount')}
              value={row.user_id ?? t('tech.statusReports.notSignedIn')}
              mono
            />
            <Field label={t('tech.common.ipAddress')} value={row.ip ?? ''} />
            <Field label={t('tech.statusReports.browser')} value={row.user_agent ?? ''} />
          </Box>
          <Mono label={t('tech.common.message')} value={row.message} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              size="small"
              label={t('shell.common.status')}
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusReportStatus)}
              sx={{ minWidth: 180 }}
            >
              {statusOptions(t).map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              label={t('tech.statusReports.note')}
              placeholder={t('tech.statusReports.notePlaceholder')}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="error" startIcon={<DeleteOutlineIcon />} onClick={remove}>
          {t('shell.common.delete')}
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose}>{t('shell.common.close')}</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {t('shell.common.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
