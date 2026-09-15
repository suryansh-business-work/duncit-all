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
    <Dialog open={!!target} onClose={onClose} data-testid="pod-idea-delete-dialog">
      <DialogTitle data-testid="pod-idea-delete-title">{t('admin.podIdeas.deleteTitle')}</DialogTitle>
      <DialogContent>
        <Typography>
          This will permanently delete <b>{target?.title}</b> along with all its comments.
        </Typography>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} data-testid="pod-idea-delete-cancel">{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton color="error" variant="contained" onClick={onConfirm} data-testid="pod-idea-delete-confirm">
          {t('shell.common.delete')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
