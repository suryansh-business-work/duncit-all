import { Avatar, Box, Typography } from '@mui/material';
import { accountEmail, accountName, initials, type ShellUser } from '../user-display';

export interface SidebarUserCardProps {
  user?: ShellUser;
  /** Portal short name — the fallback for the display name + initials. */
  fallbackName: string;
}

/** The signed-in identity pinned at the bottom of the sidebar. */
export function SidebarUserCard({ user, fallbackName }: Readonly<SidebarUserCardProps>) {
  if (!user) return null;
  const email = accountEmail(user);
  return (
    <Box sx={{ px: 2, py: 1.25, borderTop: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1.25 }}>
      <Avatar src={user.profile_photo || undefined} sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13 }}>
        {initials(user, fallbackName)}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {accountName(user, fallbackName)}
        </Typography>
        {email && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
            {email}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
