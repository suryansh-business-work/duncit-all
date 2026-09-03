import { Box, Stack, Typography } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import ClubPodsSection from './ClubPodsSection';
import ClubQuickActions from './ClubQuickActions';
import YourClubsSection from './YourClubsSection';
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
    <Stack spacing={2.25} sx={{ maxWidth: 760, mx: 'auto', width: '100%' }}>
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "center"
      }}>
        <Box
          sx={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            color: 'primary.contrastText',
            background: 'linear-gradient(135deg, #ff4f73 0%, #ff7a59 100%)',
          }}
        >
          <GroupsIcon fontSize="small" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, lineHeight: 1 }}>
            {t('mweb.studioPods.clubStudio')}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 600
            }}>
            {t('mweb.studioPods.clubSubtitle')}
          </Typography>
        </Box>
      </Stack>

      <ClubQuickActions />

      <YourClubsSection />

      <ClubPodsSection />

      <StudioChangeRequests role="CLUB_ADMIN" />
    </Stack>
  );
}
