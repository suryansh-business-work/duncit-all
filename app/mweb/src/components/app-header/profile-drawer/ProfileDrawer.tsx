import { useState } from 'react';
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../../../ColorModeContext';
import { useStudioMode } from '../../../StudioModeContext';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { STUDIO_HOME_PATH, STUDIO_LABEL, availableModes, resolveMode } from '../../../studio-mode';
import DrawerFooter from './DrawerFooter';
import MenuItemRow from './MenuItem';
import PoliciesSection from './PoliciesSection';
import StudioSwitchDialog from './StudioSwitchDialog';
import UserSummary from './UserSummary';
import UserModeContent from './UserModeContent';
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
  const { mode, setMode } = useStudioMode();
  const showPodPlans = useFeatureFlag('pod_plans_section');
  const [switchOpen, setSwitchOpen] = useState(false);
  const isDark = colorMode.mode === 'dark';
  const roles: string[] = me?.roles ?? [];
  const effectiveMode = resolveMode(mode, roles);
  const canSwitch = availableModes(roles).length > 1;
  const { items } = useMenuItems({ roles, onClose });
  const go = (to: string) => {
    onClose();
    navigate(to);
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
        <Box sx={{ p: 2.5, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 900, letterSpacing: 0.4 }}>
            {effectiveMode === 'USER' ? 'Profile' : STUDIO_LABEL[effectiveMode]}
          </Typography>
          <IconButton size="small" onClick={onClose} sx={{ bgcolor: 'action.hover' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {effectiveMode === 'USER' ? (
            <UserModeContent me={me} showPodPlans={showPodPlans} onNavigate={go} />
          ) : (
            <>
              <UserSummary me={me} onClick={() => go('/profile')} />
              <List sx={{ py: 1 }}>
                {items.map((it) => (
                  <MenuItemRow key={it.label} item={it} />
                ))}
              </List>
            </>
          )}

          {canSwitch && (
            <Box sx={{ px: 2.5, pb: 1.5 }}>
              <ListItemButton
                onClick={() => setSwitchOpen(true)}
                sx={{ borderRadius: 2.5, border: 1, borderColor: 'divider', '&:hover': { borderColor: 'primary.main' } }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                  <SwapHorizIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Switch role"
                  secondary={STUDIO_LABEL[effectiveMode]}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: 800 }}
                />
              </ListItemButton>
            </Box>
          )}

          <Divider />
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2.5, py: 1.25 }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              {isDark ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Dark mode
              </Typography>
            </Stack>
            <Switch checked={isDark} onChange={colorMode.toggle} inputProps={{ 'aria-label': 'Toggle dark mode' }} />
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
      <StudioSwitchDialog
        open={switchOpen}
        roles={roles}
        current={effectiveMode}
        onClose={() => setSwitchOpen(false)}
        onSelect={(next) => {
          setMode(next);
          setSwitchOpen(false);
          onClose();
          navigate(STUDIO_HOME_PATH[next]);
        }}
      />
    </Drawer>
  );
}
