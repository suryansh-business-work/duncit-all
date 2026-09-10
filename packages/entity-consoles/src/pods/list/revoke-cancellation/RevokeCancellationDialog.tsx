import {
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import RefundLedger from './RefundLedger';
import type { PodRevokePreview } from './queries';

interface Props {
  open: boolean;
  podTitle: string;
  preview: PodRevokePreview | null;
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * The last screen before a cancelled pod is put back on the platform.
 *
 * It exists to price the decision rather than to ask for it twice: what comes
 * back is mechanical (the pod, its venue slot, its stock), what does not is
 * money, and the only way an admin can weigh that is to see who was already
 * paid and how much. Everything below the warning is that ledger.
 */
export default function RevokeCancellationDialog({
  open,
  podTitle,
  preview,
  saving,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('admin.pods.revokeCancellationTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2">
            {t('admin.pods.revokeCancellationBody', { vars: { title: podTitle } })}
          </Typography>
          <Alert severity="warning">{t('admin.pods.revokeCancellationCaveat')}</Alert>
          <RefundLedger
            refunds={preview?.refunds ?? []}
            lossTotal={preview?.loss_total ?? 0}
            heldTotal={preview?.held_total ?? 0}
            currencySymbol={preview?.currency_symbol ?? ''}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={saving}>
          {t('admin.pods.revokeCancel')}
        </DuncitButton>
        <DuncitButton onClick={onConfirm} variant="contained" color="warning" loading={saving}>
          {t('admin.pods.revokeCancellationConfirm')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
