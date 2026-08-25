import { type ReactNode } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Grid, Stack, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { BackButton, QueryGuard } from '@duncit/ui';
import { useFeatureFlag } from '@duncit/app-settings';
import { POD_DETAIL, type AdminPodAttendeeRow } from './queries';
import { PodDetailsScopeProvider, usePodDetailsScope, type PodDetailsScope } from './scope';
import PodStatusChips from './PodStatusChips';
import PodOverviewCard from './PodOverviewCard';
import PodTimelineSection from './PodTimelineSection';
import PodAttendeesSection from './PodAttendeesSection';
import PodPaymentsSection from './PodPaymentsSection';
import PodHostsCard from './PodHostsCard';
import PodClubCard from './PodClubCard';
import PodClubAdminsCard from './PodClubAdminsCard';
import PodFinanceSection from './PodFinanceSection';
import PodFeedbackSection from './PodFeedbackSection';

/** One gap for the whole page, so nothing is 2 here and 3 there. */
const GAP = 2.5;

export interface PodDetailsViewProps {
  /** Who is reading — picks the admin or the club-scoped query set. */
  scope?: PodDetailsScope;
  /** Where Back goes. Defaults to the admin pods list. */
  backTo?: string;
  backLabel?: string;
  /** Where Edit goes. Omit to hide the action entirely — a reader whose portal
   * has no edit route should not be shown a button that goes nowhere. */
  editTo?: (podId: string) => string;
  /** Where a club admin's name links to. Omit on a portal with no user pages —
   * Club Admin's own console has none, and a name that navigates nowhere reads
   * as a broken page rather than as a missing feature. */
  userTo?: (userId: string) => string;
  /** Rendered under the tables. The admin portal puts its coupons section here;
   * it stays out of this package because coupon management is platform-wide
   * (ADMIN_RW create/delete) and reaches into the admin coupons page. */
  footer?: (pod: { id: string; pod_title: string }) => ReactNode;
}

/** Wraps the view in its scope, so every self-fetching section below reads the
 * query set its audience is actually allowed to run. */
export default function PodDetailsPage(props: Readonly<PodDetailsViewProps>) {
  return (
    <PodDetailsScopeProvider scope={props.scope ?? 'ADMIN'}>
      <PodDetailsView {...props} />
    </PodDetailsScopeProvider>
  );
}

function PodDetailsView({
  backTo = '/pods',
  backLabel = 'Pods',
  editTo = (podId: string) => `/pods/${podId}/edit`,
  userTo,
  footer,
}: Readonly<PodDetailsViewProps>) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const scopeDocs = usePodDetailsScope();
  const showProducts = useFeatureFlag('is_product_visible');
  const { data, loading, error } = useQuery(POD_DETAIL, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const attendeesQuery = useQuery(scopeDocs.attendees, {
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
            spacing={2}
            sx={{
              alignItems: { xs: 'stretch', sm: 'flex-start' },
              justifyContent: "space-between"
            }}>
            <Stack spacing={1.25} sx={{ minWidth: 0 }}>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "center",
                  minWidth: 0
                }}>
                <BackButton onClick={() => navigate(backTo)}>{backLabel}</BackButton>
                <Typography variant="h5" noWrap sx={{
                  fontWeight: 900
                }}>
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
              onClick={() => navigate(editTo(pod.id))}
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
          <Grid container spacing={GAP} sx={{
            alignItems: "flex-start"
          }}>
            <Grid
              size={{
                xs: 12,
                lg: 7
              }}>
              <Stack spacing={GAP}>
                <PodOverviewCard pod={pod} showProducts={showProducts} />
                <PodTimelineSection pod={pod} />
              </Stack>
            </Grid>
            <Grid
              size={{
                xs: 12,
                lg: 5
              }}>
              <Stack spacing={GAP}>
                <PodHostsCard pod={pod} attendees={attendeeRows} />
                <PodClubCard clubId={pod.club_id ?? null} />
                <PodClubAdminsCard clubId={pod.club_id ?? null} userTo={userTo} />
                <PodFinanceSection podId={pod.id} />
                <PodFeedbackSection podId={pod.id} />
              </Stack>
            </Grid>
          </Grid>

          {/* The tables want every pixel of width, so they sit below both
              columns rather than inside one. */}
          {/* Read-only. Marking somebody present used to be a bare "Mark
              present" link in this table's Status cell — one click, no
              confirmation, on the write that decides what the host is paid.
              It now lives in the Mark Attendance section the Partners console
              injects through `footer`, behind a warning that names who is
              about to be marked. */}
          <PodAttendeesSection
            rows={attendeeRows}
            loading={attendeesQuery.loading}
            podDateTime={pod.pod_date_time}
            errorText={attendeesQuery.error?.message}
          />
          <PodPaymentsSection podId={pod.id} />
          {footer?.(pod)}
        </Stack>
      )}
    </QueryGuard>
  );
}
