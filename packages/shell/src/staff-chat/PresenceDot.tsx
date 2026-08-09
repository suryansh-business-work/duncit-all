import { Badge, type Theme } from '@mui/material';
import type { ReactNode } from 'react';
import type { PresenceStatus } from './usePresence';

/**
 * The dot on an avatar.
 *
 * Colour AND position carry the same meaning, but colour alone would not be
 * readable to everyone — so the status word is always written next to it in the
 * places where it matters, and this is the glance version.
 */
const colorFor = (theme: Theme, status: PresenceStatus): string => {
  const byStatus: Record<PresenceStatus, string> = {
    ONLINE: theme.palette.success.main,
    AWAY: theme.palette.warning.main,
    BUSY: theme.palette.error.main,
    OFFLINE: theme.palette.text.disabled,
  };
  return byStatus[status];
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
          backgroundColor: (theme) => colorFor(theme, status),
          boxShadow: (theme) => `0 0 0 2px ${theme.palette.background.paper}`,
        },
      }}
    >
      {children}
    </Badge>
  );
}
