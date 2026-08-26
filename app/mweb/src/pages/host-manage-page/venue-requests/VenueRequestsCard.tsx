import {
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import VenueRequestRow from './VenueRequestRow';
import type { HostPodRowActions } from '../hostPodRowActions';

/** What the section says when it has nothing to list. */
export interface VenueRequestsEmptyCopy {
  title: string;
  text: string;
}

interface Props {
  icon: SvgIconComponent;
  /** Tone of the header icon — amber while waiting, red once refused. */
  iconColor: 'warning' | 'error';
  title: string;
  subtitle: string;
  /**
   * Copy for the empty state, or null for a section that should not exist at
   * all until it has something in it — which is exactly Rejected Pods.
   */
  empty: VenueRequestsEmptyCopy | null;
  pods: readonly any[];
  loading: boolean;
  /** Per-row wiring into the shared action dialogs the page owns. */
  rowProps: (pod: any) => HostPodRowActions;
}

/**
 * One venue-approval section — Requested Pods, or Rejected Pods. Both list the
 * same card and differ only in copy, tone and whether an empty list is worth a
 * heading, so they are one component rather than two that drift (rule 40).
 */
export default function VenueRequestsCard({
  icon: Icon,
  iconColor,
  title,
  subtitle,
  empty,
  pods,
  loading,
  rowProps,
}: Readonly<Props>) {
  const emptyState = empty ? (
    <Stack spacing={0.5} sx={{ alignItems: 'center', py: 2.5, textAlign: 'center' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {empty.title}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {empty.text}
      </Typography>
    </Stack>
  ) : null;

  if (pods.length === 0 && !emptyState) return null;

  let body;
  if (loading) {
    body = (
      <Stack sx={{ alignItems: 'center', py: 3 }}>
        <CircularProgress size={22} />
      </Stack>
    );
  } else if (pods.length === 0) {
    body = emptyState;
  } else {
    body = (
      <Stack spacing={1}>
        {pods.map((pod: any) => (
          <VenueRequestRow key={pod.id} pod={pod} {...rowProps(pod)} />
        ))}
      </Stack>
    );
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: '16px' }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Icon color={iconColor} />
          <Stack sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          </Stack>
          <Chip size="small" label={pods.length} />
        </Stack>
        <Divider sx={{ mb: 1.5 }} />
        {body}
      </CardContent>
    </Card>
  );
}
