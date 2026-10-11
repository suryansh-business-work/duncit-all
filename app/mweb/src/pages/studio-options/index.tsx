import { Navigate, useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import AppsIcon from '@mui/icons-material/Apps';
import { PRODUCT_VISIBILITY_FLAG } from '@duncit/app-settings';
import {
  STUDIO_OPTIONS_ENTRY,
  canSwitchVenues,
  heldStudioModes,
  studioOptionsFor,
  type PartnerStudioMode,
} from '@duncit/utils';
import { useStudioMode } from '../../StudioModeContext';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';
import { useTranslation } from '../../i18n/useTranslation';
import { useUserInfo } from '../../user-info/useUserInfo';
import VenueSwitcher from '../venue-manage-page/VenueSwitcher';
import { MY_VENUES_SWITCHER } from '../venue-manage-page/queries';
import StudioOptionsList from './StudioOptionsList';
import StudioRoleSwitcher from './StudioRoleSwitcher';

/**
 * Venue Options: the venue every venue option opens for. The pick is
 * remembered, so the dashboard, availability, settings, requests and pods
 * pages all open on it.
 */
function VenueOptionsPicker() {
  const { t } = useTranslation();
  const { data } = useQuery(MY_VENUES_SWITCHER, { fetchPolicy: 'cache-and-network' });
  const venues = data?.myVenues ?? [];
  const { venueId, selectVenue } = useSelectedVenue(venues);
  if (!canSwitchVenues(venues)) return null;
  return (
    <Stack spacing={0.75} sx={{ px: 2 }} data-testid="studio-options-venue">
      <VenueSwitcher venues={venues} venueId={venueId} onChange={selectVenue} />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('mweb.studioOptions.selectVenueHint')}
      </Typography>
    </Stack>
  );
}

/**
 * The Studio — the page the drawer's one "Studio" entry and a role switch both
 * open: every option the role has, as a list with each option's hint, from the
 * catalogue native and the Partner console render too (@duncit/utils
 * studio-options). A partner with more than one role switches between them at
 * the top, and the options below swap to the chosen role's; the path
 * (`/host/options`, `/venues/options`, …) is the role, so a refresh, Back and a
 * shared link all keep it.
 */
export default function StudioOptionsPage({ mode }: Readonly<{ mode: PartnerStudioMode }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { me, loading } = useUserInfo();
  const autoPods = useFeatureFlag('auto_pods');
  const products = useFeatureFlag(PRODUCT_VISIBILITY_FLAG);
  const { setMode } = useStudioMode();
  const entry = STUDIO_OPTIONS_ENTRY[mode];
  const roles: string[] = me?.roles ?? [];
  const items = studioOptionsFor(mode, roles, { autoPods });
  // The roles the switcher offers — the same list the role switch offers.
  const held = heldStudioModes(roles, { products });
  // Switching here is a role switch like any other: the role is remembered,
  // and the path changes with it so a refresh, Back and a shared link keep it.
  // It REPLACES the entry — Back leaves the Studio instead of stepping back
  // through every role that was looked at.
  const switchRole = (next: PartnerStudioMode) => {
    setMode(next);
    navigate(STUDIO_OPTIONS_ENTRY[next].path, { replace: true });
  };

  // A studio the account does not hold has no options to list.
  if (!loading && items.length === 0) return <Navigate to="/" replace />;

  return (
    <Stack spacing={2} sx={{ py: 2, maxWidth: 760, mx: 'auto', width: '100%' }} data-testid={`studio-options-${mode.toLowerCase()}`}>
      <Box sx={{ px: 2 }}>
        <StudioPageHeader icon={<AppsIcon fontSize="small" />} title={t(entry.labelKey)} />
      </Box>
      <StudioRoleSwitcher modes={held} value={mode} onChange={switchRole} />
      {mode === 'VENUE' && <VenueOptionsPicker />}
      {loading ? (
        <Box sx={{ px: 2 }} data-testid="studio-options-loading">
          <Skeleton variant="rounded" height={240} />
        </Box>
      ) : (
        <StudioOptionsList items={items} onNavigate={(path) => navigate(path)} />
      )}
    </Stack>
  );
}
