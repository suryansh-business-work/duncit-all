import { useQuery } from '@apollo/client';
import { Alert, Box, Divider, Stack, Typography } from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import type { StatusColorMap } from '@duncit/ui';
import SectionCard, { SectionEmpty } from './SectionCard';
import PodLifecycleStrip, { type LifecycleStep } from './PodLifecycleStrip';
import PodActivityFeed from './PodActivityFeed';
import { type PodAuditEntry } from './queries';
import { usePodDetailsScope } from './scope';

const ACTION_COLORS: StatusColorMap = {
  CREATE: 'success',
  UPDATE: 'info',
  RESUBMIT: 'info',
  DELETE: 'error',
  VENUE_APPROVED: 'success',
  VENUE_DECLINED: 'warning',
  COMPLETE: 'primary',
};

/** The three lifecycle steps and which of them this pod has reached. */
function lifecycleOf(pod: any): LifecycleStep[] {
  const cancelled = Boolean(pod.is_deleted);
  const finished = cancelled || Boolean(pod.completed_at);
  const started = pod.pod_date_time && new Date(pod.pod_date_time).getTime() <= Date.now();
  const endedAt = cancelled ? pod.deleted_at : pod.completed_at;

  return [
    { key: 'created', label: 'Created', when: pod.created_at, done: true },
    { key: 'date', label: 'Pod date', when: pod.pod_date_time, done: Boolean(started) },
    {
      key: 'end',
      label: cancelled ? 'Cancelled' : 'Completed',
      when: finished ? endedAt : null,
      done: finished,
      failed: cancelled,
    },
  ];
}

interface Props {
  pod: any;
}

/** Lifecycle strip (Created → Pod date → Completed/Cancelled) + the pod's full
 * audit activity, including who cancelled it and why. */
export default function PodTimelineSection({ pod }: Readonly<Props>) {
  const scopeDocs = usePodDetailsScope();
  const { data, loading, error } = useQuery(scopeDocs.auditTrail, {
    variables: { id: pod.id },
    fetchPolicy: 'cache-and-network',
  });
  const entries: PodAuditEntry[] = data?.podAuditLogs ?? [];
  const cancelEntry = entries.find((e) => e.action === 'DELETE');

  return (
    <SectionCard
      icon={<TimelineIcon fontSize="small" />}
      title="Timeline"
      loading={loading && entries.length === 0}
    >
      <Stack spacing={2.5}>
        <PodLifecycleStrip steps={lifecycleOf(pod)} />

        {pod.is_deleted && (
          <Alert severity="error">
            {cancelEntry
              ? `Cancelled by ${cancelEntry.actor_name || cancelEntry.source} — ${cancelEntry.note || 'no reason recorded'}`
              : 'This pod was cancelled.'}
          </Alert>
        )}

        <Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>
            Activity
          </Typography>
          {error && <Alert severity="error">{error.message}</Alert>}
          {!error && !loading && entries.length === 0 && (
            <SectionEmpty text="No recorded activity yet." />
          )}
          <PodActivityFeed entries={entries} colorMap={ACTION_COLORS} />
        </Box>
      </Stack>
    </SectionCard>
  );
}
