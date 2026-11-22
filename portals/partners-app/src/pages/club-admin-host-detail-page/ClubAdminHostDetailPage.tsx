import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Link as RouterLink, useParams } from 'react-router';
import { Alert, Avatar, Box, Card, CardContent, Skeleton, Snackbar, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonIcon from '@mui/icons-material/Person';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import HostContactCard from './HostContactCard';
import HostScoreCard from './HostScoreCard';
import HostPodsTabs from './HostPodsTabs';
import HostEngagementForm, { type HostEngagementValues } from './host-engagement';
import { CLUB_ADMIN_HOST_DETAIL, SET_CLUB_HOST_ENGAGEMENT, type ClubHostDetail } from './queries';

/**
 * Club Admin › Your Clubs › Hosts › one host: how to reach them, a warning
 * when they have gone quiet, this month's score with past months beside it,
 * the engagement status the club admin keeps, and their pods in this club.
 */
export default function ClubAdminHostDetailPage() {
  const { t } = useTranslation();
  const { clubId = '', userId = '' } = useParams();
  const [toast, setToast] = useState<string | null>(null);
  const detail = useQuery<{ clubAdminHostDetail: ClubHostDetail | null }>(CLUB_ADMIN_HOST_DETAIL, {
    variables: { club_id: clubId, user_id: userId },
    fetchPolicy: 'cache-and-network',
  });
  const [saveEngagement] = useMutation(SET_CLUB_HOST_ENGAGEMENT);
  const host = detail.data?.clubAdminHostDetail;
  const engagement = useMemo<HostEngagementValues>(
    () => ({ status_key: host?.engagement_status_key ?? '', note: host?.engagement_note ?? '' }),
    [host?.engagement_status_key, host?.engagement_note],
  );
  const hostsPath = `/club-admin/clubs/${clubId}/hosts`;

  const onSave = async (values: HostEngagementValues) => {
    await saveEngagement({
      variables: { club_id: clubId, host_user_id: userId, status_key: values.status_key, note: values.note || null },
    });
    setToast(t('clubAdmin.hosts.saved'));
    await detail.refetch();
  };

  const back = (
    <DuncitButton variant="outlined" component={RouterLink} to={hostsPath} startIcon={<ArrowBackIcon />} data-testid="club-host-back">
      {t('clubAdmin.hosts.backToHosts')}
    </DuncitButton>
  );

  if (detail.loading && !detail.data) return <Skeleton variant="rounded" height={320} data-testid="club-host-loading" />;
  if (detail.error) return <Alert severity="error" action={back}>{detail.error.message}</Alert>;
  if (!host) {
    return (
      <Alert severity="info" action={back} data-testid="club-host-not-found">
        {t('clubAdmin.hosts.notFound')}
      </Alert>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Avatar src={host.photo_url ?? undefined} alt="" sx={{ width: 48, height: 48 }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                  {t('clubAdmin.hosts.detailEyebrow', { vars: { club: host.club_name } })}
                </Typography>
                <Typography variant="h5" component="h1" sx={{ fontWeight: 950 }} data-testid="club-host-name">
                  {host.name}
                </Typography>
              </Box>
            </Stack>
            {back}
          </Stack>
          <HostContactCard host={host} />
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
            <HostScoreCard host={host} />
            <HostEngagementForm
              statuses={host.statuses}
              value={engagement}
              updatedAt={host.engagement_updated_at}
              onSubmit={onSave}
            />
          </Box>
          <HostPodsTabs clubId={clubId} hostId={userId} />
        </Stack>
      </CardContent>
      <Snackbar open={!!toast} autoHideDuration={2500} message={toast ?? ''} onClose={() => setToast(null)} />
    </Card>
  );
}
