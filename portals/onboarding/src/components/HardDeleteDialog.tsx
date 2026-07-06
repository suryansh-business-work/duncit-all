import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

interface Props {
  open: boolean;
  /** Lower-case noun, e.g. "venue", "host", "brand". */
  entityLabel: string;
  entityName: string;
  loading?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: (email: string, password: string) => void;
}

/** Developer-only permanent delete dialog. Re-confirms with the signed-in user's
 * own email + password before a destructive, irreversible delete. */
export default function HardDeleteDialog({
  open,
  entityLabel,
  entityName,
  loading = false,
  error,
  onClose,
  onConfirm,
}: Readonly<Props>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const close = () => {
    setEmail('');
    setPassword('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : close} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
        <WarningAmberIcon /> Delete {entityLabel}
      </DialogTitle>
      <DialogContent>
        <Alert severity="error" icon={false} sx={{ mb: 2 }}>
          This action cannot be undone. <strong>{entityName || `This ${entityLabel}`}</strong> will be
          permanently deleted from everywhere.
        </Alert>
        <DialogContentText>
          Confirm with your own account email and password to continue.
        </DialogContentText>
        <Stack spacing={2} mt={2}>
          <TextField
            label="Your email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            autoComplete="off"
            disabled={loading}
          />
          <TextField
            label="Your password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            autoComplete="off"
            disabled={loading}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={loading}>
          Cancel
        </Button>
        <Button
          color="error"
          variant="contained"
          onClick={() => onConfirm(email.trim(), password)}
          disabled={!canSubmit}
        >
          {loading ? 'Deleting…' : 'Delete permanently'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
