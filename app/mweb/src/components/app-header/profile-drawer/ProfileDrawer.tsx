import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../../../ColorModeContext';
import DrawerFooter from './DrawerFooter';
import MenuItemRow from './MenuItem';
import PoliciesSection from './PoliciesSection';
import UserSummary from './UserSummary';
import { useMenuItems } from './useMenuItems';

interface Props {
  open: boolean;
  onClose: () => void;
  me: any;
  publicPolicies: { id: string; slug: string; title: string }[];
  policiesOpen: boolean;
  setPoliciesOpen: (fn: (v: boolean) => boolean) => void;
  onLogout: () => void;
}

export default function ProfileDrawer({
  open,
  onClose,
  me,
  publicPolicies,
  policiesOpen,
  setPoliciesOpen,
  onLogout,
}: Readonly<Props>) {
  const navigate = useNavigate();
  const colorMode = useColorMode();
  const isDark = colorMode.mode === 'dark';
  const roles: string[] = me?.roles ?? [];
  const { baseItems, hostItem, venueItem, supportItems } = useMenuItems({
    roles,
    onClose,
  });
  const openProfile = () => {
    onClose();
    navigate('/profile');
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: 318, sm: 360 },
          borderLeft: 0,
          bgcolor: 'background.default',
          backgroundImage: 'var(--duncit-app-bg)',
          backgroundSize: '180% 180%',
          animation: 'duncit-bg-drift 36s ease-in-out infinite alternate',
          boxShadow: '-24px 0 50px rgba(0,0,0,0.34)',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box
          sx={{
            p: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 900, letterSpacing: 0.4 }}>
            Account
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ bgcolor: 'action.hover' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <UserSummary me={me} roles={roles} onClick={openProfile} />
        <Divider />
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          <List sx={{ py: 1 }}>
            {baseItems.map((it) => (
              <MenuItemRow key={it.label} item={it} />
            ))}
            <MenuItemRow item={hostItem} />
            <MenuItemRow item={venueItem} />
          </List>
          <Divider />
          <List sx={{ py: 1 }}>
            {supportItems.map((it) => (
              <MenuItemRow key={it.label} item={it} />
            ))}
          </List>
          <Divider />
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2.5, py: 1.25 }}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              {isDark ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Dark mode
              </Typography>
            </Stack>
            <Switch
              checked={isDark}
              onChange={colorMode.toggle}
              inputProps={{ 'aria-label': 'Toggle dark mode' }}
            />
          </Stack>
          {publicPolicies.length > 0 && (
            <>
              <Divider />
              <PoliciesSection
                publicPolicies={publicPolicies}
                policiesOpen={policiesOpen}
                setPoliciesOpen={setPoliciesOpen}
                onClose={onClose}
              />
            </>
          )}
        </Box>
        <Divider />
        <DrawerFooter onLogout={onLogout} />
      </Box>
    </Drawer>
  );
}
