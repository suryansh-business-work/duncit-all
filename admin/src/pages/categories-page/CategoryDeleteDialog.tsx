import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from '@mui/material';
import type { CatItem, Level } from './queries';

interface Props {
  target: { level: Level; item: CatItem } | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CategoryDeleteDialog({ target, busy, error, onClose, onConfirm }: Props) {
  const levelLabel =
    target?.level === 'SUPER'
      ? 'Super Category'
      : target?.level === 'CATEGORY'
        ? 'Category'
        : 'Sub-Category';
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
              FAQs, sliders and submissions.
            </>
          )}
          {target?.level === 'CATEGORY' && (
            <> This will also remove its sub-categories, clubs and pods.</>
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
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={onConfirm} color="error" variant="contained" disabled={busy}>
          {busy ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
