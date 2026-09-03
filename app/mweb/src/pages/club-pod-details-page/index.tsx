import { Link as RouterLink, useParams } from 'react-router';
import { Box, Card, CardActionArea, CardContent, Stack, Typography } from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { PodDetailsPage, type PodDetailsViewProps } from '@duncit/pod-details';
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
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardActionArea component={RouterLink} to={`/host/pod/${podId}/attendance`}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'primary.main' }}>
            <CheckCircleOutlinedIcon fontSize="small" />
            <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 700 }}>
              {t('clubAdmin.pods.podAttendance')}
            </Typography>
            <ChevronRightIcon fontSize="small" color="action" />
          </Stack>
        </CardContent>
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
        footer={renderAttendanceFooter}
      />
    </Box>
  );
}
