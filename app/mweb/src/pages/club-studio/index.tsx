import { Stack } from '@mui/material';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import ClubPodsSection from './ClubPodsSection';
import YourClubsSection from './YourClubsSection';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * Club Studio → Your Clubs: the clubs the admin runs and their pods. The
 * figures live on the Club dashboard; monitoring and change requests each have
 * their own Club Options page.
 *
 * Its "Your Pods" section is the Venue Studio section rendered from the club
 * side, through one shared component, so the two studios cannot drift in
 * layout, wording or arithmetic (rules 27/34/40).
 */
export default function ClubStudioPage() {
  const { t } = useTranslation();

  return (
    <Stack data-testid="club-studio-page" spacing={3} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <StudioPageHeader icon={<GroupsRoundedIcon fontSize="small" />} title={t('mweb.studioPods.clubStudio')} />

      <YourClubsSection />

      <ClubPodsSection />
    </Stack>
  );
}
