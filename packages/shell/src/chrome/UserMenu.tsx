import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, Box, ButtonBase, ListItemIcon, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { accountEmail, accountName, initials, type ShellUser } from './user-display';

export interface UserMenuProps {
  user?: ShellUser;
  /** Portal short name — the fallback for the display name + initials. */
  fallbackName: string;
  /** Route of the profile page; the Profile item is omitted when not provided. */
  profileTo?: string;
  onLogout: () => void;
}

/** Header account block: 28px avatar + name/email (hidden on xs) opening Profile/Logout. */
export function UserMenu({ user, fallbackName, profileTo, onLogout }: Readonly<UserMenuProps>) {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const email = accountEmail(user);

  const handleProfile = () => {
    setAnchorEl(null);
    if (profileTo) navigate(profileTo);
  };

  const handleLogout = () => {
    setAnchorEl(null);
    onLogout();
  };

  return (
    <>
      <Tooltip title="Account">
        <ButtonBase
          onClick={(e) => setAnchorEl(e.currentTarget)}
          aria-label="account menu"
          aria-haspopup="menu"
          sx={{ gap: 1, px: 0.5, py: 0.25, borderRadius: 1 }}
        >
          <Box sx={{ display: { xs: 'none', sm: 'block' }, textAlign: 'right', minWidth: 0, maxWidth: 200 }}>
            <Typography variant="caption" fontWeight={700} noWrap sx={{ display: 'block', lineHeight: 1.2 }}>
              {accountName(user, fallbackName)}
            </Typography>
            {email && (
              <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', lineHeight: 1.2 }}>
                {email}
              </Typography>
            )}
          </Box>
          <Avatar src={user?.profile_photo || undefined} sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 12 }}>
            {initials(user, fallbackName)}
          </Avatar>
        </ButtonBase>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {profileTo && (
          <MenuItem onClick={handleProfile}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
        )}
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
}
