import { Link as RouterLink } from 'react-router-dom';
import { Button, Chip, Stack } from '@mui/material';
import type { AutoPodLabels, AutoPodRow, AutoPodStage } from '@duncit/utils';

export interface AutoPodMineActionProps {
  row: AutoPodRow;
  labels: AutoPodLabels;
  /** Route to the finished pod, for the roles this portal has a pod page for. */
  podHref?: string | null;
}

/** How the offer ended, or null while it is still collecting its three partners. */
function stageLabel(stage: AutoPodStage, labels: AutoPodLabels): string | null {
  if (stage === 'LIVE') return labels.liveNow;
  if (stage === 'CANCELLED') return labels.cancelled;
  if (stage === 'EXPIRED') return labels.expired;
  return null;
}

/**
 * What a partner sees on an offer they already enrolled in: where it ended up,
 * and the pod itself once all three enrolments materialized one.
 */
export default function AutoPodMineAction({
  row,
  labels,
  podHref,
}: Readonly<AutoPodMineActionProps>) {
  const status = stageLabel(row.stage, labels);
  const statusColor = row.stage === 'LIVE' ? 'success' : 'default';
  if (!status && !podHref) return null;

  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        alignItems: "center",
        flexWrap: "wrap"
      }}>
      {status ? <Chip size="small" color={statusColor} label={status} /> : null}
      {podHref ? (
        <Button size="small" component={RouterLink} to={podHref}>
          {labels.viewPod}
        </Button>
      ) : null}
    </Stack>
  );
}
