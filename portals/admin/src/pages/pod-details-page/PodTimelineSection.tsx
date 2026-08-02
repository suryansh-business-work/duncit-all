import { useQuery } from '@apollo/client';
import {
  Alert,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Typography,
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
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
    <Card sx={{ flex: 1, minWidth: 0, width: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
          <TimelineIcon color="primary" />
          <Typography variant="subtitle1" fontWeight={900}>
            Timeline
          </Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />

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
          <Alert severity="error" sx={{ mt: 2 }}>
            {cancelEntry
              ? `Cancelled by ${cancelEntry.actor_name || cancelEntry.source} — ${cancelEntry.note || 'no reason recorded'}`
              : 'This pod was cancelled.'}
          </Alert>
        )}

        <Typography variant="subtitle2" fontWeight={800} sx={{ mt: 2.5, mb: 1 }}>
          Activity
        </Typography>
        {error && <Alert severity="error">{error.message}</Alert>}
        {!error && loading && entries.length === 0 && <CircularProgress size={20} />}
        {!error && !loading && entries.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No recorded activity yet.
          </Typography>
        )}
        <Stack spacing={1.25} sx={{ maxHeight: 320, overflowY: 'auto', pr: 1 }}>
          {entries.map((entry) => (
            <Stack key={entry.id} direction="row" spacing={1} alignItems="flex-start">
              <StatusChip status={entry.action} colorMap={ACTION_COLORS} sx={{ mt: 0.25 }} />
              <Stack sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                  {entry.actor_name || entry.source}
                  <Chip label={entry.source} size="small" variant="outlined" sx={{ ml: 1 }} />
                </Typography>
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
      </CardContent>
    </Card>
  );
}
