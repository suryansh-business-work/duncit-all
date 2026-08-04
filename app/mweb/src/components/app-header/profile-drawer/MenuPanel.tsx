import { useState } from 'react';
import {
  Box,
  Divider,
  IconButton,
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
import { useTranslation } from '../../../i18n/useTranslation';
import { STUDIO_HOME_PATH, STUDIO_LABEL, availableModes, resolveMode } from '../../../studio-mode';
import DrawerFooter from './DrawerFooter';
import PoliciesSection from './PoliciesSection';
import StudioSwitchDialog from './StudioSwitchDialog';
import UserModeContent from './UserModeContent';

interface Props {
  /** Closes the menu — the page hands back to the previous route. */
  onClose: () => void;
  me: any;
  publicPolicies: { id: string; slug: string; title: string }[];
  policiesOpen: boolean;
  setPoliciesOpen: (fn: (v: boolean) => boolean) => void;
  onLogout: () => void;
}

/** Body of the account menu page (/menu): identity + quick actions, role switch,
 * dark mode, policies and logout. It is a full page rather than a drawer so the
 * browser Back button and a refresh behave like any other route — the ✕ in the
 * header is what returns to where the user came from. */
export default function MenuPanel({
  onClose,
  me,
  publicPolicies,
  policiesOpen,
  setPoliciesOpen,
  onLogout,
}: Readonly<Props>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const colorMode = useColorMode();
  const { mode, setMode } = useStudioMode();
  const showPodPlans = useFeatureFlag('pod_plans_section');
  const [switchOpen, setSwitchOpen] = useState(false);
  const isDark = colorMode.mode === 'dark';
  const roles: string[] = me?.roles ?? [];
  const effectiveMode = resolveMode(mode, roles);
  const canSwitch = availableModes(roles).length > 1;
  // Leaving the menu REPLACES its history entry, so Back from the destination
  // returns to the page the menu was opened from — never through the menu
  // again. Native pops the menu before navigating for the same reason.
  const go = (to: string) => navigate(to, { replace: true });

  return (
    <Box
      data-testid="menu-panel"
      sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}
    >
      <Box
        sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
          {effectiveMode === 'USER' ? 'Profile' : STUDIO_LABEL[effectiveMode]}
        </Typography>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label={t('mweb.home.closeMenu')}
          sx={{ bgcolor: 'action.hover' }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1 }}>
        {/* One unified card layout for every role — the studio-specific menu
            list was retired so all modes share this design. */}
        <UserModeContent me={me} roles={roles} mode={effectiveMode} showPodPlans={showPodPlans} onNavigate={go} />

        {canSwitch && (
          <Box sx={{ px: 2, pb: 1.25 }}>
            <ListItemButton
              onClick={() => setSwitchOpen(true)}
              sx={{ borderRadius: '16px', border: 1, borderColor: 'divider', '&:hover': { borderColor: 'primary.main' } }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                <SwapHorizIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Switch role"
                secondary={STUDIO_LABEL[effectiveMode]}
                primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
              />
            </ListItemButton>
          </Box>
        )}

        <Divider />
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.1 }}>
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
            />
          </>
        )}
      </Box>

      <Divider />
      <DrawerFooter onLogout={onLogout} />
      <StudioSwitchDialog
        open={switchOpen}
        roles={roles}
        current={effectiveMode}
        onClose={() => setSwitchOpen(false)}
        onSelect={(next) => {
          setMode(next);
          setSwitchOpen(false);
          go(STUDIO_HOME_PATH[next]);
        }}
      />
    </Box>
  );
}
