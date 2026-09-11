import { CircularProgress, Stack, Typography } from '@mui/material';
import VenueRequestRow from './VenueRequestRow';
import HostSectionHeader from '../HostSectionHeader';
import RowGroup from '../RowGroup';
import type { HostPodRowActions } from '../hostPodRowActions';

/** The old two-line empty copy — kept exported for existing importers; the
 * section now draws only its one line (`emptyText`). */
export interface VenueRequestsEmptyCopy {
  title: string;
  text: string;
}

interface Props {
  title: string;
  /**
   * The one line an empty section says, or null for a section that should not
   * exist at all until it has something in it — which is exactly Rejected Pods.
   */
  emptyText: string | null;
  pods: readonly any[];
  loading: boolean;
  /** Per-row wiring into the shared action dialogs the page owns. */
  rowProps: (pod: any) => HostPodRowActions;
}

/**
 * One venue-approval section — Requested Pods, or Rejected Pods. Both list the
 * same row and differ only in copy and whether an empty list is worth a
 * heading, so they are one component rather than two that drift (rule 40).
 */
export default function VenueRequestsCard({
  title,
  emptyText,
  pods,
  loading,
  rowProps,
}: Readonly<Props>) {
  if (pods.length === 0 && !emptyText) return null;

  let body;
  if (loading) {
    body = (
      <Stack sx={{ alignItems: 'center', py: 3 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  } else if (pods.length === 0) {
    body = (
      <Typography
        variant="body2"
        sx={{ px: 2, py: 2.5, textAlign: 'center', color: 'text.secondary' }}
      >
        {emptyText}
      </Typography>
    );
  } else {
    body = pods.map((pod: any) => <VenueRequestRow key={pod.id} pod={pod} {...rowProps(pod)} />);
  }

  return (
    <Stack spacing={1.5}>
      <HostSectionHeader title={title} count={pods.length} />
      <RowGroup>{body}</RowGroup>
    </Stack>
  );
}
