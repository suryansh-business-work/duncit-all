import { Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';

interface Props {
  target: any;
  onClose: () => void;
  onConfirm: () => void;
}

export default function IdeaDeleteDialog({ target, onClose, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog open={!!target} onClose={onClose}>
      <DialogTitle>{t('admin.podIdeas.deleteTitle')}</DialogTitle>
      <DialogContent>
        <Typography>
          This will permanently delete <b>{target?.title}</b> along with all its comments.
        </Typography>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton color="error" variant="contained" onClick={onConfirm}>
          {t('shell.common.delete')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
