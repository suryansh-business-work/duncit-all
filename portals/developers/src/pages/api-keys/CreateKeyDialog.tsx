import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface Props {
  open: boolean;
  busy: boolean;
  /** Set once the key is created — shown exactly once, then gone forever. */
  rawKey: string | null;
  error: string | null;
  onCreate: (name: string) => void;
  onClose: () => void;
}

/** Create-key dialog: name → create → one-time raw key reveal with copy. */
export default function CreateKeyDialog({ open, busy, rawKey, error, onCreate, onClose }: Readonly<Props>) {
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);

  const close = () => {
    setName('');
    setCopied(false);
    onClose();
  };

  const copy = async () => {
    if (!rawKey) return;
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>{rawKey ? 'API key created' : 'Create API key'}</DialogTitle>
      <DialogContent>
        {rawKey ? (
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="warning">
              Copy this key now — it is shown only once and cannot be recovered.
            </Alert>
            <TextField
              value={rawKey}
              fullWidth
              InputProps={{
                readOnly: true,
                sx: { fontFamily: 'monospace' },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label="Copy API key" onClick={copy}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {copied && (
              <Typography variant="caption" color="success.main" fontWeight={800}>
                Copied to clipboard
              </Typography>
            )}
          </Stack>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              label="Key name"
              placeholder="e.g. Staging integration"
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              autoFocus
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{rawKey ? 'Done' : 'Cancel'}</Button>
        {!rawKey && (
          <Button
            variant="contained"
            disabled={!name.trim() || busy}
            onClick={() => onCreate(name.trim())}
          >
            {busy ? 'Creating…' : 'Create key'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
