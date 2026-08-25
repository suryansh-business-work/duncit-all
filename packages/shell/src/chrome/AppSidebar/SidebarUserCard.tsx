import { Avatar, Box, Tooltip, Typography } from '@mui/material';
import { accountEmail, accountName, initials, type ShellUser } from '../user-display';

export interface SidebarUserCardProps {
  user?: ShellUser;
  /** Portal short name — the fallback for the display name + initials. */
  fallbackName: string;
  /** Icon rail: the avatar alone, with the name in its tooltip. */
  collapsed?: boolean;
}

/** The signed-in identity pinned at the bottom of the sidebar. */
export function SidebarUserCard({ user, fallbackName, collapsed = false }: Readonly<SidebarUserCardProps>) {
  if (!user) return null;
  const email = accountEmail(user);
  const name = accountName(user, fallbackName);
  const avatar = (
    <Avatar src={user.profile_photo || undefined} sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>
      {initials(user, fallbackName)}
    </Avatar>
  );
  if (collapsed) {
    return (
      <Box sx={{ px: 1, py: 1.25, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center' }}>
        <Tooltip title={name} placement="right">
          {avatar}
        </Tooltip>
      </Box>
    );
  }
  return (
    <Box sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.25 }}>
      {avatar}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" noWrap sx={{
          fontWeight: 700
        }}>
          {name}
        </Typography>
        {email && (
          <Typography
            variant="caption"
            noWrap
            sx={{
              color: "text.secondary",
              display: 'block'
            }}>
            {email}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
