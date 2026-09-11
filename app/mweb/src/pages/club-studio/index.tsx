import { Stack } from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import ClubPodsSection from './ClubPodsSection';
import ClubQuickActions from './ClubQuickActions';
import YourClubsSection from './YourClubsSection';
import StudioPageHeader from '../../components/StudioPageHeader';
import StudioChangeRequests from '../../components/studio-pods/StudioChangeRequests';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Club Studio — the in-app home a Club Admin never had: the mode used to land on
 * the wallet and its drawer menu was empty.
 *
 * Its "Your Pods" section is the Venue Studio section rendered from the club
 * side, through one shared component, so the two studios cannot drift in
 * layout, wording or arithmetic (rules 27/34/40).
 */
export default function ClubStudioPage() {
  const { t } = useTranslation();

  return (
    <Stack spacing={3} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <StudioPageHeader icon={<GroupsRoundedIcon fontSize="small" />} title={t('mweb.studioPods.clubStudio')} />

      <ClubQuickActions />

      <YourClubsSection />

      <ClubPodsSection />

      <StudioChangeRequests role="CLUB_ADMIN" />
    </Stack>
  );
}
