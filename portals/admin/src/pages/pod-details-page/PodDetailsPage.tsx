import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Grid, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { BackButton, QueryGuard } from '@duncit/ui';
import { useFeatureFlag } from '@duncit/app-settings';
import { POD_ATTENDEES_ADMIN, POD_DETAIL, type AdminPodAttendeeRow } from './queries';
import PodStatusChips from './PodStatusChips';
import PodOverviewCard from './PodOverviewCard';
import PodTimelineSection from './PodTimelineSection';
import PodAttendeesSection from './PodAttendeesSection';
import PodPaymentsSection from './PodPaymentsSection';
import PodHostsCard from './PodHostsCard';
import PodClubCard from './PodClubCard';
import PodCouponsSection from './PodCouponsSection';
import PodFinanceSection from './PodFinanceSection';
import PodFeedbackSection from './PodFeedbackSection';

/** One gap for the whole page, so nothing is 2 here and 3 there. */
const GAP = 2.5;

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
      {() => (
        <Stack spacing={GAP}>
          {/* Title, state and the one action, as a single block — the chips
              belong to the heading, not to a separate band under it. */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'stretch', sm: 'flex-start' }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack spacing={1.25} sx={{ minWidth: 0 }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                <BackButton onClick={() => navigate('/pods')}>Pods</BackButton>
                <Typography variant="h5" fontWeight={900} noWrap>
                  {pod.pod_title}
                </Typography>
              </Stack>
              <PodStatusChips pod={pod} />
            </Stack>
            {/* Editable at every stage — a cancelled pod included, so an admin
                can correct it (or re-route its venue slot) after the fact
                rather than rebuilding it. */}
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/pods?edit=${pod.id}`)}
              sx={{ flexShrink: 0 }}
            >
              Edit pod
            </Button>
          </Stack>

          {/* Two columns that end at roughly the same line. The old layout
              paired each tall card with a short one, which is what left the
              half-page void beside the club card: the narrative on the left
              (what it is, what happened to it) against the people-and-money
              sidebar on the right (who ran it, what it took, how it scored). */}
          <Grid container spacing={GAP} alignItems="flex-start">
            <Grid item xs={12} lg={7}>
              <Stack spacing={GAP}>
                <PodOverviewCard pod={pod} showProducts={showProducts} />
                <PodTimelineSection pod={pod} />
              </Stack>
            </Grid>
            <Grid item xs={12} lg={5}>
              <Stack spacing={GAP}>
                <PodHostsCard pod={pod} attendees={attendeeRows} />
                <PodClubCard clubId={pod.club_id ?? null} />
                <PodFinanceSection podId={pod.id} />
                <PodFeedbackSection podId={pod.id} />
              </Stack>
            </Grid>
          </Grid>

          {/* The tables want every pixel of width, so they sit below both
              columns rather than inside one. */}
          <PodAttendeesSection
            rows={attendeeRows}
            loading={attendeesQuery.loading}
            podDateTime={pod.pod_date_time}
            errorText={attendeesQuery.error?.message}
          />
          <PodPaymentsSection podId={pod.id} />
          <PodCouponsSection podId={pod.id} podTitle={pod.pod_title} />
        </Stack>
      )}
    </QueryGuard>
  );
}
