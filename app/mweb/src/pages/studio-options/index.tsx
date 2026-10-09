import { Navigate, useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import AppsIcon from '@mui/icons-material/Apps';
import {
  STUDIO_OPTIONS_ENTRY,
  canSwitchVenues,
  studioOptionsFor,
  type PartnerStudioMode,
} from '@duncit/utils';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';
import { useTranslation } from '../../i18n/useTranslation';
import { useUserInfo } from '../../user-info/useUserInfo';
import VenueSwitcher from '../venue-manage-page/VenueSwitcher';
import { MY_VENUES_SWITCHER } from '../venue-manage-page/queries';
import StudioOptionsList from './StudioOptionsList';

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
 * A studio's Options page — the page the drawer's one highlighted entry
 * ("Venue Options", "Host Options", …) opens: every option the studio has, as
 * a list with each option's hint, from the catalogue native and the Partner
 * console render too (@duncit/utils studio-options).
 */
export default function StudioOptionsPage({ mode }: Readonly<{ mode: PartnerStudioMode }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { me, loading } = useUserInfo();
  const autoPods = useFeatureFlag('auto_pods');
  const entry = STUDIO_OPTIONS_ENTRY[mode];
  const items = studioOptionsFor(mode, me?.roles ?? [], { autoPods });

  // A studio the account does not hold has no options to list.
  if (!loading && items.length === 0) return <Navigate to="/" replace />;

  return (
    <Stack spacing={2} sx={{ py: 2, maxWidth: 760, mx: 'auto', width: '100%' }} data-testid={`studio-options-${mode.toLowerCase()}`}>
      <Box sx={{ px: 2 }}>
        <StudioPageHeader icon={<AppsIcon fontSize="small" />} title={t(entry.labelKey)} />
      </Box>
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
