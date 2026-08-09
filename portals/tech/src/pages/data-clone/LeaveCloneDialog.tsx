import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { useTranslation } from '@duncit/shell';

interface Props {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
}

/**
 * In-app navigation warning while a clone runs. A browser close/refresh is
 * caught separately by `beforeunload` — the browser owns that prompt — but an
 * in-app route change is ours, so it is an MUI dialog (rule 12), never a
 * window.confirm.
 */
export default function LeaveCloneDialog({ open, onStay, onLeave }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={open} onClose={onStay} maxWidth="xs" fullWidth>
      <DialogTitle>{t('tech.dataClone.leaveTitle')}</DialogTitle>
      <DialogContent>
        <DialogContentText>{t('tech.dataClone.leaveMessage')}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onLeave} color="inherit">
          {t('tech.dataClone.leaveAnyway')}
        </Button>
        <Button onClick={onStay} variant="contained" autoFocus>
          {t('tech.dataClone.leaveStay')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
