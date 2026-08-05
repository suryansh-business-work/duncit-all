import { useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Chip,
  Divider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import SectionCard, { SectionEmpty } from './SectionCard';
import { POD_AUDIT_TRAIL, type PodAuditEntry } from './queries';
import { fmtDateTime } from './format';

const ACTION_COLORS: StatusColorMap = {
  CREATE: 'success',
  UPDATE: 'info',
  RESUBMIT: 'info',
  DELETE: 'error',
  VENUE_APPROVED: 'success',
  VENUE_DECLINED: 'warning',
  COMPLETE: 'primary',
};

/** The stage the pod is at plus the step index the stepper should show. */
function stageOf(pod: any): { terminal: string; error: boolean; active: number } {
  if (pod.is_deleted) return { terminal: 'Cancelled', error: true, active: 3 };
  if (pod.completed_at) return { terminal: 'Completed', error: false, active: 3 };
  const started = pod.pod_date_time && new Date(pod.pod_date_time).getTime() <= Date.now();
  return { terminal: 'Completed', error: false, active: started ? 2 : 1 };
}

interface Props {
  pod: any;
}

/** Lifecycle stepper (Created → Pod date → Completed/Cancelled) + the pod's
 * full audit activity, including who cancelled it and why. */
export default function PodTimelineSection({ pod }: Readonly<Props>) {
  const { data, loading, error } = useQuery(POD_AUDIT_TRAIL, {
    variables: { id: pod.id },
    fetchPolicy: 'cache-and-network',
  });
  const entries: PodAuditEntry[] = data?.podAuditLogs ?? [];
  const stage = stageOf(pod);
  const cancelEntry = entries.find((e) => e.action === 'DELETE');
  const terminalDate = pod.is_deleted ? pod.deleted_at : pod.completed_at;

  return (
    <SectionCard
      icon={<TimelineIcon fontSize="small" />}
      title="Timeline"
      loading={loading && entries.length === 0}
    >
      <Stack spacing={2.5}>
        <Stepper activeStep={stage.active} alternativeLabel>
          <Step completed>
            <StepLabel optional={<Typography variant="caption">{fmtDateTime(pod.created_at)}</Typography>}>
              Created
            </StepLabel>
          </Step>
          <Step completed={stage.active >= 2}>
            <StepLabel optional={<Typography variant="caption">{fmtDateTime(pod.pod_date_time)}</Typography>}>
              Pod date
            </StepLabel>
          </Step>
          <Step completed={stage.active === 3}>
            <StepLabel
              error={stage.error}
              optional={
                <Typography variant="caption">
                  {stage.active === 3 ? fmtDateTime(terminalDate) : 'Pending'}
                </Typography>
              }
            >
              {stage.terminal}
            </StepLabel>
          </Step>
        </Stepper>

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
          {/* Scrolls rather than growing: a busy pod's audit trail would
              otherwise set the height of the whole left column. */}
          <Stack spacing={1.5} sx={{ maxHeight: 340, overflowY: 'auto', pr: 1 }}>
            {entries.map((entry) => (
              <Stack key={entry.id} direction="row" spacing={1.25} alignItems="flex-start">
                <StatusChip status={entry.action} colorMap={ACTION_COLORS} sx={{ mt: 0.25 }} />
                <Stack sx={{ minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Typography variant="body2" fontWeight={700} noWrap>
                      {entry.actor_name || entry.source}
                    </Typography>
                    <Chip label={entry.source} size="small" variant="outlined" />
                  </Stack>
                  {entry.note && (
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                      {entry.note}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {fmtDateTime(entry.created_at)}
                  </Typography>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Stack>
    </SectionCard>
  );
}
