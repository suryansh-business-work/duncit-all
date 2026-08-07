import { Avatar, Box, Stack, Typography } from '@mui/material';
import type { CallKind, CallPhase } from '../useCall';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const LABEL: Record<CallPhase, string> = {
  idle: '',
  ringing: 'Ringing…',
  incoming: 'is calling',
  connected: 'Connected',
};

interface Props {
  phase: CallPhase;
  kind: CallKind;
  peerName: string;
  peerPhoto: string;
  sharing: boolean;
}

/**
 * Who you are on with, and what the call is doing.
 *
 * The ring pulses while it rings — a static avatar and a word are not enough to
 * tell "calling" from "on a call" at a glance, and the one moment a caller is
 * staring at this panel is the moment nothing has happened yet. It is an
 * ::after on a wrapper rather than a box-shadow on the avatar, so the pulse
 * cannot resize anything around it.
 */
export default function CallHeader({
  phase,
  kind,
  peerName,
  peerPhoto,
  sharing,
}: Readonly<Props>) {
  const ringing = phase === 'ringing' || phase === 'incoming';

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box
        sx={{
          position: 'relative',
          display: 'inline-flex',
          ...(ringing && {
            '&::after': {
              content: '""',
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: 2,
              borderColor: 'primary.main',
              animation: 'staffCallPulse 1.4s ease-out infinite',
            },
            '@keyframes staffCallPulse': {
              '0%': { transform: 'scale(0.9)', opacity: 0.9 },
              '70%': { transform: 'scale(1.35)', opacity: 0 },
              '100%': { transform: 'scale(1.35)', opacity: 0 },
            },
            '@media (prefers-reduced-motion: reduce)': {
              '&::after': { animation: 'none', opacity: 0.6 },
            },
          }),
        }}
      >
        <Avatar src={peerPhoto || undefined} sx={{ width: 32, height: 32 }}>
          {initials(peerName)}
        </Avatar>
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="subtitle2" noWrap>
          {peerName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {kind === 'VIDEO' ? 'Video' : 'Audio'} · {LABEL[phase]}
          {sharing ? ' · sharing your screen' : ''}
        </Typography>
      </Box>
    </Stack>
  );
}
