import { Alert, Button, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import EmailIcon from '@mui/icons-material/Email';
import type { Control } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import type { ContactActionValues, ContactType } from '../contact-action.form';

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
          {type === 'EMAIL' && <RhfTextField control={control} name="subject" label="Subject" />}
          <RhfTextField control={control} name="status" select label="Status" required>
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
                label="Duration seconds"
                type="number"
                inputProps={{ min: 0, step: 1 }}
              />
              <RhfTextField control={control} name="recording_url" label="Recording URL" />
            </Stack>
          )}
          <RhfTextField control={control} name="notes" label="Notes" multiline minRows={4} />
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
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={busy || !target}>
          {busy ? 'Saving...' : 'Save Log'}
        </Button>
      </DialogActions>
    </>
  );
}
