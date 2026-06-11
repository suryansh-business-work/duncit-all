import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

interface Props {
  open: boolean;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}

export default function GoogleAuthNoticeDialog({
  open,
  title,
  message,
  actionLabel,
  onAction,
  onClose,
}: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {actionLabel && onAction && (
          <Button variant="contained" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
