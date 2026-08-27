import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import type { CatItem, Level } from './queries';
import { useTranslation } from '@duncit/shell';

interface Props {
  target: { level: Level; item: CatItem } | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CategoryDeleteDialog({ target, busy, error, onClose, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  const nonSuperLabel = target?.level === 'CATEGORY' ? 'Category' : 'Sub-Category';
  const levelLabel = target?.level === 'SUPER' ? 'Super Category' : nonSuperLabel;
  return (
    <Dialog
      open={!!target}
      onClose={() => (busy ? undefined : onClose())}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Delete {levelLabel}?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          You are about to permanently delete <strong>{target?.item.name}</strong>.
          {target?.level === 'SUPER' && (
            <>
              {' '}This will also remove all its categories, sub-categories, clubs, pods,
              FAQs and submissions.
            </>
          )}
          {target?.level === 'CATEGORY' && (
            <> {t('admin.categories.deleteWarning')}</>
          )}
          {' '}This action cannot be undone.
        </DialogContentText>
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 2 }}>
            {error}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} disabled={busy}>
          {t('shell.common.cancel')}
        </DuncitButton>
        <DuncitButton onClick={onConfirm} color="error" variant="contained" disabled={busy}>
          {busy ? 'Deleting…' : t('shell.common.delete')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
