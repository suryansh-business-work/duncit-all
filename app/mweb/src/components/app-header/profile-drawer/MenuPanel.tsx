import { useState } from 'react';
import {
  Box,
  Divider,
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
import { DuncitIconButton } from '@duncit/buttons';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../../../ColorModeContext';
import { useStudioMode } from '../../../StudioModeContext';
import { useAutoPodCounts } from '../../../hooks/useAutoPodCounts';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { PRODUCT_VISIBILITY_FLAG } from '@duncit/app-settings';
import { useTranslation } from '../../../i18n/useTranslation';
import { STUDIO_LABEL, availableModes, resolveMode, studioSwitchPath } from '../../../studio-mode';
import DrawerFooter from './DrawerFooter';
import PoliciesSection from './PoliciesSection';
import StudioSwitchDialog from './StudioSwitchDialog';
import MenuRefreshBar from './MenuRefreshBar';
import MenuSkeleton from './MenuSkeleton';
import UserModeContent from './UserModeContent';

interface Props {
  /** Closes the menu — the page hands back to the previous route. */
  onClose: () => void;
  /** The account query is still in flight with nothing cached — body skeletons. */
  loading?: boolean;
  /** A read is in flight over content already on screen — the top bar runs. */
  refreshing?: boolean;
  /** The policy links are still in flight — that group skeletons its own row. */
  policiesLoading?: boolean;
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
  loading = false,
  refreshing = false,
  policiesLoading = false,
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
  const showLeaderboard = useFeatureFlag('leaderboard');
  const showMembership = useFeatureFlag('membership');
  const showGiftCards = useFeatureFlag('gift_cards');
  const showTourGuide = useFeatureFlag('tour_guide');
  const showAutoPods = useFeatureFlag('auto_pods');
  const showProducts = useFeatureFlag(PRODUCT_VISIBILITY_FLAG);
  const [switchOpen, setSwitchOpen] = useState(false);
  const isDark = colorMode.mode === 'dark';
  const roles: string[] = me?.roles ?? [];
  // Fetched with the menu, not with the dialog, so the switch below already
  // knows whether an Auto Pod is waiting on the role being switched into.
  const autoPods = useAutoPodCounts(roles);
  // Products off drops the E-commerce studio from the switcher AND from a
  // persisted mode, so nobody is left sitting in a studio whose pages are gated.
  const studioAccess = { products: showProducts };
  const effectiveMode = resolveMode(mode, roles, studioAccess);
  const canSwitch = availableModes(roles, studioAccess).length > 1;
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
        <Typography
          variant="subtitle2"
          sx={{
            color: "text.secondary",
            fontWeight: 700,
            letterSpacing: 0.4
          }}>
          {effectiveMode === 'USER' ? 'Profile' : STUDIO_LABEL[effectiveMode]}
        </Typography>
        <DuncitIconButton
          size="small"
          onClick={onClose}
          aria-label={t('mweb.home.closeMenu')}
          sx={{ bgcolor: 'action.hover' }}
        >
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </Box>

      <MenuRefreshBar active={refreshing} />

      <Box sx={{ flex: 1 }}>
        {/* One unified card layout for every role — the studio-specific menu
            list was retired so all modes share this design. */}
        {loading ? (
          <MenuSkeleton />
        ) : (
          <UserModeContent
            me={me}
            roles={roles}
            mode={effectiveMode}
            showPodPlans={showPodPlans}
            showLeaderboard={showLeaderboard}
            showMembership={showMembership}
            showGiftCards={showGiftCards}
            showTourGuide={showTourGuide}
            showAutoPods={showAutoPods}
            onNavigate={go}
          />
        )}

        {canSwitch && (
          <Box sx={{ px: 2, pb: 1.25 }}>
            <ListItemButton
              onClick={() => {
                autoPods.reload();
                setSwitchOpen(true);
              }}
              sx={{ borderRadius: '16px', border: 1, borderColor: 'divider', '&:hover': { borderColor: 'primary.main' } }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'primary.main' }}>
                <SwapHorizIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={t('mweb.common.switchRole')}
                secondary={STUDIO_LABEL[effectiveMode]}
                slotProps={{
                  primary: { sx: { fontSize: 14, fontWeight: 600 } }
                }}
              />
            </ListItemButton>
          </Box>
        )}

        <Divider />
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.1
          }}>
          <Stack direction="row" spacing={1.5} sx={{
            alignItems: "center"
          }}>
            {isDark ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Dark mode
            </Typography>
          </Stack>
          <Switch checked={isDark} onChange={colorMode.toggle} slotProps={{
            input: { 'aria-label': 'Toggle dark mode' }
          }} />
        </Stack>
        {(policiesLoading || publicPolicies.length > 0) && (
          <>
            <Divider />
            <PoliciesSection
              loading={policiesLoading}
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
        showProducts={showProducts}
        current={effectiveMode}
        onClose={() => setSwitchOpen(false)}
        onSelect={(next) => {
          setMode(next);
          setSwitchOpen(false);
          // An Auto Pod waiting on the new role wins over its dashboard.
          go(studioSwitchPath(next, autoPods.counts));
        }}
      />
    </Box>
  );
}
