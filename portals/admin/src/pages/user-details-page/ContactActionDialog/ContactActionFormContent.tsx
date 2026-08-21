import { Alert, Button, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import EmailIcon from '@mui/icons-material/Email';
import type { Control } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import type { ContactActionValues, ContactType } from '../contact-action.form';
import { useTranslation } from '@duncit/shell';

interface Props {
  type: ContactType;
  user: any;
  target: string;
  statusOptions: readonly string[];
  error: string | null;
  busy: boolean;
  control: Control<ContactActionValues>;
  values: ContactActionValues;
  onClose: () => void;
  onSubmit: () => void;
  onOpenNativeAction: (subject: string) => void;
  onStartRecorded: (notes: string) => void;
}

export default function ContactActionFormContent({
  type,
  user,
  target,
  statusOptions,
  error,
  busy,
  control,
  values,
  onClose,
  onSubmit,
  onOpenNativeAction,
  onStartRecorded,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <>
      <DialogTitle data-dialog-drag-handle="true" sx={{ cursor: 'move' }}>
        {type === 'CALL' ? 'Call User' : 'Email User'}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Typography variant="body2" color="text.secondary">
            {user.full_name || user.email || user.user_id}
          </Typography>
          <TextField
            label={type === 'CALL' ? 'Phone' : 'Email'}
            value={target}
            disabled
            fullWidth
            helperText={target ? ' ' : 'No target available for this contact action.'}
          />
          {type === 'EMAIL' && <RhfTextField control={control} name="subject" label={t('admin.contact.subject')} />}
          <RhfTextField control={control} name="status" select label={t('shell.common.status')} required>
            {statusOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </RhfTextField>
          {type === 'CALL' && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <RhfTextField
                control={control}
                name="duration_seconds"
                label={t('admin.contact.durationSeconds')}
                type="number"
                inputProps={{ min: 0, step: 1 }}
              />
              <RhfTextField control={control} name="recording_url" label={t('admin.contact.recordingUrl')} />
            </Stack>
          )}
          <RhfTextField control={control} name="notes" label={t('admin.contact.notes')} multiline minRows={4} />
        </Stack>
      </DialogContent>
      <DialogActions>
        {type === 'CALL' && (
          <Button onClick={() => onStartRecorded(values.notes)} startIcon={<CallIcon />} disabled={busy || !target}>
            Start Recorded Call
          </Button>
        )}
        <Button
          onClick={() => onOpenNativeAction(values.subject)}
          startIcon={type === 'CALL' ? <CallIcon /> : <EmailIcon />}
          disabled={!target}
        >
          {type === 'CALL' ? 'Open Dialer' : 'Open Email'}
        </Button>
        <Button onClick={onClose} disabled={busy}>
          {t('shell.common.cancel')}
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={busy || !target}>
          {busy ? 'Saving...' : 'Save Log'}
        </Button>
      </DialogActions>
    </>
  );
}
