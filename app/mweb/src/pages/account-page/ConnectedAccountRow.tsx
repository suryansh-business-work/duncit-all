import type { ReactNode } from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Button, Stack, Typography } from '@mui/material';

interface Props {
  label: string;
  /** The address this method signs in with, or the not-connected placeholder. */
  value: string;
  /** Secondary line — "Active", or when the link was granted. */
  status?: string;
  connected: boolean;
  busy?: boolean;
  disconnectLabel?: string;
  /** Omitted when disconnecting is not allowed — see `hint`. */
  onDisconnect?: () => void;
  /** Why the disconnect action is absent (Google is the only way in). */
  hint?: string;
  /** Rendered in place of the disconnect action when not connected. */
  connectControl?: ReactNode;
}

/** One sign-in method in Profile > Connected accounts. */
export default function ConnectedAccountRow({
  label,
  value,
  status,
  connected,
  busy,
  disconnectLabel,
  onDisconnect,
  hint,
  connectControl,
}: Readonly<Props>) {
  return (
    <Stack spacing={1}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
      >
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
          {connected ? (
            <CheckCircleIcon fontSize="small" color="success" />
          ) : (
            <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
          )}
          <Stack sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2">{label}</Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {value}
            </Typography>
            {status && (
              <Typography variant="caption" color="text.secondary">
                {status}
              </Typography>
            )}
          </Stack>
        </Stack>

        {onDisconnect && disconnectLabel && (
          <Button
            color="error"
            variant="outlined"
            disabled={busy}
            onClick={onDisconnect}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '16px' }}
          >
            {disconnectLabel}
          </Button>
        )}
        {connectControl}
      </Stack>

      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Stack>
  );
}
