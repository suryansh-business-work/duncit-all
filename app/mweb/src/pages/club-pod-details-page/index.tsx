import { Link as RouterLink, useParams } from 'react-router';
import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { NO_POD_ACTIONS, NO_POD_BANNER, PodDetailsPage, type PodDetailsViewProps } from '@duncit/pod-details';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * The door to the pod's attendance board. mWeb already has the page — the
 * board is viewer-aware, so a club admin opening it sees the Club Admin
 * override rather than the host's scanner — so this is a link, not a second
 * copy of the Partners console's attendance section.
 */
function AttendanceLinkCard({ podId }: Readonly<{ podId: string }>) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardActionArea component={RouterLink} to={`/host/pod/${podId}/attendance`}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 2, py: 1.5, minHeight: 60 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'action.hover',
              color: 'primary.main',
            }}
          >
            <CheckCircleOutlineRoundedIcon fontSize="small" />
          </Box>
          <Typography sx={{ flex: 1, fontSize: '0.95rem', fontWeight: 600 }}>
            {t('clubAdmin.pods.podAttendance')}
          </Typography>
          <ChevronRightRoundedIcon sx={{ color: 'text.secondary' }} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}

/** Below the attendee table, because it is the action on the people it lists. */
const renderAttendanceFooter: NonNullable<PodDetailsViewProps['footer']> = (pod) => (
  <AttendanceLinkCard podId={pod.id} />
);

/**
 * A club admin's pod detail — the SAME page the admin portal and the Partners
 * console render, at CLUB_ADMIN scope. Scope swaps every self-fetching section
 * onto its club-scoped query, and the server gates each on
 * `assertClubAdminForPod`, so another club's pod is FORBIDDEN whatever the URL
 * says. Native opens the existing PodDetails screen for the same pod (rule 27).
 */
export default function ClubPodDetailsPage() {
  const { clubId = '' } = useParams();
  const { t } = useTranslation();
  const podsPath = `/clubs/${clubId}/pods`;

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', width: '100%' }}>
      <PodDetailsPage
        scope="CLUB_ADMIN"
        backTo={podsPath}
        backLabel={t('clubAdmin.pods.clubPods')}
        editTo={(podId) => `${podsPath}/${podId}/edit`}
        actions={NO_POD_ACTIONS}
        banner={NO_POD_BANNER}
        footer={renderAttendanceFooter}
      />
    </Box>
  );
}
