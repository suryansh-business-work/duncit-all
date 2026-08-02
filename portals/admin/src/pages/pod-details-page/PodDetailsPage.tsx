import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Chip, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { BackButton, QueryGuard } from '@duncit/ui';
import { POD_ATTENDEES_ADMIN, POD_DETAIL, type AdminPodAttendeeRow } from './queries';
import PodOverviewCard from './PodOverviewCard';
import PodTimelineSection from './PodTimelineSection';
import PodAttendeesSection from './PodAttendeesSection';
import PodPaymentsSection from './PodPaymentsSection';
import PodHostsCard from './PodHostsCard';
import PodClubCard from './PodClubCard';
import PodCouponsSection from './PodCouponsSection';
import PodFinanceSection from './PodFinanceSection';
import { useFeatureFlag } from '@duncit/app-settings';

export default function PodDetailsPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const showProducts = useFeatureFlag('is_product_visible');
  const { data, loading, error } = useQuery(POD_DETAIL, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const attendeesQuery = useQuery(POD_ATTENDEES_ADMIN, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const pod = data?.pod;
  const attendeeRows: AdminPodAttendeeRow[] = attendeesQuery.data?.adminPodAttendees ?? [];

  return (
    <QueryGuard
      loading={loading && !pod}
      error={error}
      errorText={error?.message}
      notFound={!pod}
      notFoundText="Pod not found."
      notFoundSeverity="warning"
    >
      {() => {
        const isVirtual = pod.pod_mode === 'VIRTUAL';
        const isFree = (pod.pod_type ?? '').includes('FREE');

        return (
          <Stack spacing={3}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                <BackButton onClick={() => navigate('/pods')}>Pods</BackButton>
                <Typography variant="h5" fontWeight={900} noWrap>
                  {pod.pod_title}
                </Typography>
              </Stack>
              {!pod.is_deleted && (
                <Button variant="contained" startIcon={<EditIcon />} onClick={() => navigate(`/pods?edit=${pod.id}`)}>
                  Edit pod
                </Button>
              )}
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={isFree ? 'Free' : `₹${pod.pod_amount}`} color="primary" />
              <Chip label={isVirtual ? 'Virtual' : 'Physical'} variant="outlined" />
              <Chip label={(pod.pod_occurrence ?? '').replaceAll('_', ' ') || 'ONE TIME'} variant="outlined" />
              {pod.is_deleted && <Chip label="Cancelled" color="error" />}
              {!pod.is_deleted && pod.completed_at && <Chip label="Completed" color="success" />}
              {!pod.is_deleted && !pod.completed_at && (
                <Chip label={pod.is_active ? 'Active' : 'Inactive'} color={pod.is_active ? 'success' : 'default'} />
              )}
              {pod.venue_approval_status !== 'NONE' && (
                <Chip label={`Venue: ${pod.venue_approval_status}`} variant="outlined" />
              )}
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="flex-start">
              <PodOverviewCard pod={pod} showProducts={showProducts} />
              <PodTimelineSection pod={pod} />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="flex-start">
              <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                <PodHostsCard pod={pod} attendees={attendeeRows} />
                <PodClubCard clubId={pod.club_id ?? null} />
              </Stack>
              <Stack spacing={2.5} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
                <PodFinanceSection podId={pod.id} />
              </Stack>
            </Stack>

            <PodAttendeesSection
              rows={attendeeRows}
              loading={attendeesQuery.loading}
              errorText={attendeesQuery.error?.message}
            />
            <PodPaymentsSection podId={pod.id} />
            <PodCouponsSection podId={pod.id} podTitle={pod.pod_title} />
          </Stack>
        );
      }}
    </QueryGuard>
  );
}
