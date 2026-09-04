import type { ReactNode } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton } from '@duncit/buttons';
import type { AutoPodLabels } from '@duncit/utils';

export interface EarningsDialogShellProps {
  labels: AutoPodLabels;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/**
 * The chrome both potential-earnings calculators wear: the title with an X in
 * its corner and a Close at the foot, so the dialog can be dismissed from
 * either end. Written once because the venue's calculator and the host's differ
 * only in what they compute (rule 34).
 */
export function EarningsDialogShell({
  labels,
  open,
  onClose,
  children,
}: Readonly<EarningsDialogShellProps>) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pr: 6 }}>
        {labels.earningsTitle}
        <IconButton
          aria-label={labels.closeAria}
          onClick={onClose}
          data-testid="auto-pod-earnings-close-icon"
          sx={{ position: 'absolute', right: 8, top: 8, color: 'text.secondary' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>{children}</Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton variant="contained" onClick={onClose} data-testid="auto-pod-earnings-close">
          {labels.close}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
