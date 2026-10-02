import { useQuery } from '@apollo/client/react';
import { useParams } from 'react-router';
import { Grid, Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useFeatureFlag } from '@duncit/app-settings';
import { POD_DETAIL, type AdminPodAttendeeRow } from '../queries';
import { PodDetailsScopeProvider, usePodDetailsScope } from '../scope';
import PodOverviewCard from '../PodOverviewCard';
import PodTimelineSection from '../PodTimelineSection';
import PodAttendeesSection from '../PodAttendeesSection';
import PodPaymentsSection from '../PodPaymentsSection';
import PodHostsCard from '../PodHostsCard';
import PodClubCard from '../PodClubCard';
import PodClubAdminsCard from '../PodClubAdminsCard';
import PodFinanceSection from '../PodFinanceSection';
import PodFeedbackSection from '../PodFeedbackSection';
import PodDetailsHeader from './PodDetailsHeader';
import type { PodDetailsViewProps } from './types';

export { NO_POD_ACTIONS, NO_POD_BANNER } from './types';
export type {
  PodDetailsActionPod,
  PodDetailsActions,
  PodDetailsBanner,
  PodDetailsViewProps,
} from './types';

/** One gap for the whole page, so nothing is 2 here and 3 there. */
const GAP = 2.5;

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
  actions,
  banner,
  editTo,
  userTo,
  footer,
}: Readonly<PodDetailsViewProps>) {
  const { id = '' } = useParams();
  const scopeDocs = usePodDetailsScope();
  const showProducts = useFeatureFlag('is_product_visible');
  const { data, loading, error } = useQuery<any>(POD_DETAIL, {
    variables: { id },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
  const attendeesQuery = useQuery<any>(scopeDocs.attendees, {
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
          <PodDetailsHeader
            pod={pod}
            backTo={backTo}
            backLabel={backLabel}
            actions={actions}
            editTo={editTo}
          />

          {/* The portal's own block, above the columns: what a reader must
              see before anything else about this pod. */}
          {banner(pod)}

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
