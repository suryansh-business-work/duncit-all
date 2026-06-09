import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import { Typography } from '@mui/material';

interface HeaderToastProps {
  toast: { title?: string; body?: string } | null;
  onClose: () => void;
}

export default function HeaderToast({ toast, onClose }: Readonly<HeaderToastProps>) {
  return (
    <Snackbar
      open={!!toast}
      onClose={onClose}
      autoHideDuration={5000}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <MuiAlert
        onClose={onClose}
        severity="info"
        variant="filled"
        icon={<NotificationsActiveIcon />}
        sx={{ width: '100%' }}
      >
        <Typography variant="subtitle2">{toast?.title}</Typography>
        <Typography variant="caption">{toast?.body}</Typography>
      </MuiAlert>
    </Snackbar>
  );
}
