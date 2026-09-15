import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
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
        <DuncitButton onClick={onLeave} color="inherit">
          {t('tech.dataClone.leaveAnyway')}
        </DuncitButton>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus -- focus moves to the safe Stay action in the dialog the user just opened (WCAG 2.4.3) */}
        <DuncitButton onClick={onStay} variant="contained" autoFocus>
          {t('tech.dataClone.leaveStay')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
