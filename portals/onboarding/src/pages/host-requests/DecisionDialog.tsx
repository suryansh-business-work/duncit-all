import { useState } from 'react';
import { Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { HostRequest } from './queries';
import { useTranslation } from '@duncit/app-settings';

export type DecisionMode = 'APPROVE' | 'REJECT';

interface Props {
  mode: DecisionMode | null;
  request: HostRequest | null;
  busy: boolean;
  onClose: () => void;
  /** Called with the trimmed notes (empty string allowed only for approve). */
  onConfirm: (notes: string) => void;
}

type Translate = ReturnType<typeof useTranslation>['t'];

const decisionCopy = (t: Translate): Record<DecisionMode, { title: string; label: string; helper: string; cta: string; color: 'success' | 'error' }> => ({
  APPROVE: {
    title: t('onboarding.hostRequests.approveHostRequest'),
    label: t('onboarding.hostRequests.notesOptional'),
    helper: 'Shared with the host on approval.',
    cta: 'Approve',
    color: 'success',
  },
  REJECT: {
    title: t('onboarding.hostRequests.rejectHostRequest'),
    label: t('onboarding.common.reason'),
    helper: 'Required — shared with the host so they know why.',
    cta: 'Reject',
    color: 'error',
  },
});

/** Approve (optional notes) / Reject (required reason) confirmation for a request. */
export default function DecisionDialog({ mode, request, busy, onClose, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  if (!mode) return null;
  const dialogCopy = decisionCopy(t)[mode];
  const trimmed = notes.trim();
  const disabled = busy || (mode === 'REJECT' && !trimmed);

  const close = () => {
    setNotes('');
    onClose();
  };
  const confirm = () => {
    if (disabled) return;
    onConfirm(trimmed);
    setNotes('');
  };

  return (
    <Dialog open={!!request} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{dialogCopy.title}</DialogTitle>
      <DialogContent dividers>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 1.5
          }}>
          {request?.request_no} · {request?.host_name}
        </Typography>
        <TextField
          label={dialogCopy.label}
          helperText={dialogCopy.helper}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={3}
          fullWidth
          required={mode === 'REJECT'}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <DuncitButton onClick={close}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton variant="contained" color={dialogCopy.color} onClick={confirm} disabled={disabled}>
          {dialogCopy.cta}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
