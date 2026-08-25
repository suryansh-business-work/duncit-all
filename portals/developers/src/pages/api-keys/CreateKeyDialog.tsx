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
import { useTranslation } from '@duncit/shell';

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
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);

  const close = () => {
    setName('');
    setCopied(false);
    onClose();
  };

  const copy = async () => {
    // Defensive: the copy button only renders in the rawKey-present branch, so
    // this guard can't be hit from the UI (kept for type-narrowing below).
    /* v8 ignore next */
    if (!rawKey) return;
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
  };

  // Hoisted out of the JSX so the dialog's two states each read as one lookup
  // rather than a ternary buried in a prop (rule 26b).
  const title = rawKey
    ? t('developers.createKey.titleCreated')
    : t('developers.createKey.titleNew');
  const closeLabel = rawKey ? t('developers.createKey.done') : t('developers.createKey.cancel');
  const submitLabel = busy
    ? t('developers.createKey.submitting')
    : t('developers.createKey.submit');

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>{title}</DialogTitle>
      <DialogContent>
        {rawKey ? (
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <Alert severity="warning">{t('developers.createKey.warning')}</Alert>
            <TextField
              value={rawKey}
              fullWidth
              slotProps={{
                input: {
                  readOnly: true,
                  sx: { fontFamily: 'monospace' },
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton aria-label={t('developers.createKey.copyAria')} onClick={copy}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
            />
            {copied && (
              <Typography
                variant="caption"
                sx={{
                  color: "success.main",
                  fontWeight: 800
                }}>
                {t('developers.createKey.copied')}
              </Typography>
            )}
          </Stack>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <TextField
              label={t('developers.createKey.nameLabel')}
              placeholder={t('developers.createKey.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              autoFocus
              required
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>{closeLabel}</Button>
        {!rawKey && (
          <Button
            variant="contained"
            disabled={!name.trim() || busy}
            onClick={() => onCreate(name.trim())}
          >
            {submitLabel}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
