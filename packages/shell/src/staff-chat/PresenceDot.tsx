import { Badge } from '@mui/material';
import type { ReactNode } from 'react';
import type { PresenceStatus } from './usePresence';

/**
 * The dot on an avatar.
 *
 * Colour AND position carry the same meaning, but colour alone would not be
 * readable to everyone — so the status word is always written next to it in the
 * places where it matters, and this is the glance version.
 */
const COLOR: Record<PresenceStatus, string> = {
  ONLINE: '#2e7d32',
  AWAY: '#ed6c02',
  BUSY: '#d32f2f',
  OFFLINE: '#9e9e9e',
};

export default function PresenceDot({
  status,
  children,
}: Readonly<{ status: PresenceStatus; children: ReactNode }>) {
  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      variant="dot"
      title={status.toLowerCase()}
      sx={{
        '& .MuiBadge-badge': {
          backgroundColor: COLOR[status],
          boxShadow: (theme) => `0 0 0 2px ${theme.palette.background.paper}`,
        },
      }}
    >
      {children}
    </Badge>
  );
}
