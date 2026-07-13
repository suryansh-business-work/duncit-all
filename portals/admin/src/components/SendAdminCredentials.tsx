import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

const SEND_CREDENTIALS = gql`
  mutation SeedSuperAdmin {
    seedSuperAdmin {
      created
      emailed
      email
    }
  }
`;

// Ambiguous characters dropped so the captcha stays easy to read.
const CAPTCHA_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const genCaptcha = () =>
  Array.from(
    globalThis.crypto.getRandomValues(new Uint8Array(5)),
    (byte) => CAPTCHA_ALPHABET[byte % CAPTCHA_ALPHABET.length]
  ).join('');

/**
 * First-time setup helper: emails the seeded super-admin credentials.
 * Gated behind a human captcha and hardened against repeat/multi clicks
 * (button is disabled while in-flight and permanently after a successful send).
 */
export default function SendAdminCredentials() {
  const [run, { loading, data, error }] = useMutation(SEND_CREDENTIALS);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(genCaptcha);
  const [entry, setEntry] = useState('');
  const [captchaError, setCaptchaError] = useState<string | null>(null);

  const sent = !!data?.seedSuperAdmin;
  const refresh = () => {
    setCode(genCaptcha());
    setEntry('');
    setCaptchaError(null);
  };
  const openDialog = () => {
    refresh();
    setOpen(true);
  };

  const confirm = async () => {
    if (loading) return; // guard against double-submit
    if (entry.trim().toUpperCase() !== code) {
      setCaptchaError('That does not match. Please try again.');
      refresh();
      return;
    }
    try {
      await run();
      setOpen(false);
    } catch {
      /* surfaced via the `error` alert below */
    }
  };

  return (
    <Stack spacing={1.5}>
      <Button variant="outlined" onClick={openDialog} disabled={loading || sent}>
        {sent ? 'Credentials sent' : 'Send Credentials to Admin'}
      </Button>

      {error && <Alert severity="error">{error.message}</Alert>}
      {sent && (
        <Alert severity="success">
          {data!.seedSuperAdmin.created
            ? `Super admin created: ${data!.seedSuperAdmin.email}`
            : `Super admin already exists: ${data!.seedSuperAdmin.email}`}
          {data!.seedSuperAdmin.emailed ? ' — credentials emailed.' : ' — email not sent (check SMTP).'}
        </Alert>
      )}
      <Typography variant="caption" color="text.secondary" textAlign="center">
        First-time setup helper. Disable in production once configured.
      </Typography>

      <Dialog open={open} onClose={loading ? undefined : () => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm you're human</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Enter the characters below to email the super-admin credentials.
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box
                sx={{
                  flex: 1,
                  py: 1.25,
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  fontSize: 24,
                  fontWeight: 800,
                  letterSpacing: 8,
                  userSelect: 'none',
                  borderRadius: 1,
                  background: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.06) 0 6px, transparent 6px 12px)',
                  border: 1,
                  borderColor: 'divider',
                }}
              >
                {code}
              </Box>
              <Tooltip title="New code">
                <IconButton onClick={refresh} disabled={loading} aria-label="refresh captcha">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
            <TextField
              label="Captcha"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              error={!!captchaError}
              helperText={captchaError ?? ' '}
              autoFocus
              fullWidth
              inputProps={{ maxLength: 5, style: { textTransform: 'uppercase', letterSpacing: 4 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={confirm} disabled={loading || !entry.trim()}>
            {loading ? 'Sending…' : 'Send credentials'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
