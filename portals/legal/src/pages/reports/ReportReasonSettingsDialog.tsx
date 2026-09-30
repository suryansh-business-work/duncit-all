import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { CONTENT_REPORT_REASON_OPTIONS, UPDATE_CONTENT_REPORT_REASON_OPTIONS } from '../../graphql/reports';

type ReasonOption = { id: string; label: string };
interface Props { open: boolean; onClose: () => void; }

export default function ReportReasonSettingsDialog({ open, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error: loadError, refetch } = useQuery(CONTENT_REPORT_REASON_OPTIONS, { skip: !open });
  const [save, { loading: saving }] = useMutation(UPDATE_CONTENT_REPORT_REASON_OPTIONS);
  const [options, setOptions] = useState<ReasonOption[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (data?.contentReportReasonOptions) setOptions(data.contentReportReasonOptions);
  }, [data]);

  const update = (index: number, patch: Partial<ReasonOption>) => {
    setOptions((current) => current.map((option, position) => position === index ? { ...option, ...patch } : option));
  };

  const add = () => setOptions((current) => [...current, { id: `REASON_${Date.now()}`, label: '' }]);

  const remove = (id: string, index: number) => {
    if (id === 'OTHER') return;
    setOptions((current) => current.filter((_, position) => position !== index));
  };

  const submit = async () => {
    try {
      await save({ variables: { options } });
      await refetch();
      notifySuccess(t('reportLogs.reasonsSaved'));
      onClose();
    } catch (saveError) {
      setError(parseApiError(saveError) || t('reportLogs.reasonsLoadFailed'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('reportLogs.settings')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {options.map((option, index) => (
            <Stack key={option.id} direction="row" spacing={1} alignItems="center">
              <TextField label={t('reportLogs.reasonCode')} value={option.id} disabled={option.id === 'OTHER'} onChange={(event) => update(index, { id: event.target.value.toUpperCase() })} />
              <TextField fullWidth label={t('reportLogs.reasonLabel')} value={option.label} onChange={(event) => update(index, { label: event.target.value })} />
              <IconButton aria-label={t('reportLogs.removeReason')} disabled={option.id === 'OTHER'} onClick={() => remove(option.id, index)}>
                <DeleteOutlineIcon />
              </IconButton>
            </Stack>
          ))}
          <DuncitButton startIcon={<AddIcon />} onClick={add}>{t('reportLogs.addReason')}</DuncitButton>
          {error && <Alert severity="error">{error}</Alert>}
          {loadError && <Alert severity="error">{t('reportLogs.reasonsLoadFailed')}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('contentReport.cancel')}</DuncitButton>
        <DuncitButton variant="contained" disabled={saving || loading || !!loadError} onClick={submit}>{t('reportLogs.saveReasons')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
