import { useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import LoginIcon from '@mui/icons-material/Login';

const OTP_LENGTH = 6;
const pillSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 999, bgcolor: 'background.paper' },
} as const;

export interface OtpLoginPanelProps {
  /** Send a code to this address. Resolves whether or not one was actually sent. */
  onRequestCode: (email: string) => Promise<void>;
  /** Trade the code for a session. Rejects with a message worth showing. */
  onSubmitCode: (email: string, code: string) => Promise<void>;
  busy: boolean;
  errorMessage?: string | null;
}

/**
 * Signing in with a code instead of a password.
 *
 * Two steps on one panel: the address, then the six digits. The wording after
 * the first step never confirms that an account exists — the server answers the
 * same way for an unknown address, an inactive one and one with no role for
 * this console, and a message here saying "sent!" versus "no such user" would
 * hand back exactly what that silence is protecting.
 *
 * Collapsed until asked for, because the password field above is still the
 * usual way in and two open forms is a choice nobody wanted to make.
 */
export default function OtpLoginPanel({
  onRequestCode,
  onSubmitCode,
  busy,
  errorMessage,
}: Readonly<OtpLoginPanelProps>) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);

  if (!open) {
    return (
      <Stack spacing={1.25}>
        <Divider>
          <Typography variant="caption" color="text.secondary">
            or
          </Typography>
        </Divider>
        <Button
          type="button"
          onClick={() => setOpen(true)}
          variant="outlined"
          fullWidth
          startIcon={<MailOutlineIcon />}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          Login with OTP
        </Button>
      </Stack>
    );
  }

  const requestCode = async () => {
    await onRequestCode(email.trim());
    setSent(true);
  };

  const submitCode = () => onSubmitCode(email.trim(), code.trim());

  const emailReady = /^\S+@\S+\.\S+$/.test(email.trim());
  const codeReady = new RegExp(String.raw`^\d{${OTP_LENGTH}}$`).test(code.trim());

  return (
    <Stack spacing={1.5}>
      <Divider>
        <Typography variant="caption" color="text.secondary">
          sign in with a code
        </Typography>
      </Divider>

      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

      <TextField
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        type="email"
        placeholder="e-mail address"
        fullWidth
        size="small"
        sx={pillSx}
        disabled={busy || sent}
      />

      {sent ? (
        <>
          <Typography variant="caption" color="text.secondary">
            If that address can sign in here, a {OTP_LENGTH}-digit code is on its way. It expires in
            a few minutes and only works for this portal.
          </Typography>
          <TextField
            value={code}
            onChange={(event) => setCode(event.target.value.replaceAll(/\D/g, '').slice(0, OTP_LENGTH))}
            placeholder={`${OTP_LENGTH}-digit code`}
            fullWidth
            size="small"
            sx={pillSx}
            inputProps={{
              inputMode: 'numeric',
              autoComplete: 'one-time-code',
              'aria-label': 'One-time code',
            }}
            disabled={busy}
          />
          <Button
            type="button"
            onClick={submitCode}
            variant="contained"
            fullWidth
            disabled={busy || !codeReady}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <LoginIcon />}
            sx={{ borderRadius: 999, fontWeight: 700 }}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          <Link
            component="button"
            type="button"
            onClick={() => {
              setSent(false);
              setCode('');
            }}
            underline="none"
            color="text.secondary"
            sx={{ alignSelf: 'center', fontSize: 13, fontWeight: 600 }}
          >
            Use a different address
          </Link>
        </>
      ) : (
        <Button
          type="button"
          onClick={requestCode}
          variant="contained"
          fullWidth
          disabled={busy || !emailReady}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <MailOutlineIcon />}
          sx={{ borderRadius: 999, fontWeight: 700 }}
        >
          {busy ? 'Sending…' : 'Email me a code'}
        </Button>
      )}

      <Link
        component="button"
        type="button"
        onClick={() => {
          setOpen(false);
          setSent(false);
          setCode('');
        }}
        underline="none"
        color="text.secondary"
        sx={{ alignSelf: 'center', fontSize: 13, fontWeight: 600 }}
      >
        Use my password instead
      </Link>
    </Stack>
  );
}
