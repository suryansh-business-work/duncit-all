import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserData } from '@duncit/user-context';
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { getAdminInitials, type AdminSessionUser } from '../adminSession';
import { useColorMode } from '../ColorModeContext';
import AdminSearch from './AdminSearch';
import { HEADER_HEIGHT } from './styled';

interface Props {
  isDesktop: boolean;
  onOpenMobile: () => void;
}

export default function Topbar({ isDesktop, onOpenMobile }: Props) {
  const { mode, toggle } = useColorMode();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();
  const { user, logout } = useUserData<AdminSessionUser>();
  const admin = user;

  const handleProfile = () => {
    setAnchorEl(null);
    navigate('/profile');
  };

  const handleLogout = () => {
    setAnchorEl(null);
    // logout() in the shared context wipes localStorage + sessionStorage AND
    // redirects to /login. No need to call removeItem('admin_token') first.
    logout();
  };

  return (
    <AppBar position="sticky">
      <Toolbar sx={{ gap: 1, minHeight: `${HEADER_HEIGHT}px !important`, px: 2 }}>
        {!isDesktop && (
          <IconButton edge="start" onClick={onOpenMobile} aria-label="open navigation">
            <MenuIcon />
          </IconButton>
        )}
        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
          <AdminSearch />
        </Box>
        <Tooltip title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}>
          <IconButton onClick={toggle} aria-label="toggle color mode">
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Account">
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
            <Avatar src={admin?.profile_photo || undefined} sx={{ width: 28, height: 28, bgcolor: 'primary.main', fontSize: 13 }}>
              {getAdminInitials(admin)}
            </Avatar>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={!!anchorEl}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={handleProfile}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
