import { Paper, Stack, Typography } from '@mui/material';
import StatusDot, { type DotState } from './StatusDot';
import { stateChipColor } from '../utils/status';
import type { OverallRoll } from '../types';

export interface OverallStatus {
  severity: DotState;
  message: string;
}

/** Pure derivation from the server roll-up, exported for unit tests. */
export function deriveOverallStatus(overall: OverallRoll | null | undefined): OverallStatus {
  if (!overall) return { severity: 'info', message: 'Checking services…' };
  const { operational, total, down, degraded } = overall;
  if (total === 0) return { severity: 'info', message: 'Awaiting the first checks.' };
  if (operational === total) return { severity: 'success', message: 'All systems operational' };
  const chip = stateChipColor(overall.state);
  const severity: DotState = chip === 'error' ? 'error' : 'warning';
  const issues = down + degraded;
  const label = down > 0 && degraded === 0 ? 'experiencing an outage' : 'reporting issues';
  return { severity, message: `${issues} of ${total} services ${label}` };
}

interface BannerProps {
  overall: OverallRoll | null | undefined;
  lastUpdated: Date | null;
}

export default function OverallStatusBanner({ overall, lastUpdated }: Readonly<BannerProps>) {
  const status = deriveOverallStatus(overall);
  return (
    <Paper variant="outlined" sx={{ px: 2.5, py: 1.75, mb: 4 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <StatusDot state={status.severity} size={12} />
          <Typography fontWeight={700}>{status.message}</Typography>
        </Stack>
        {lastUpdated && (
          <Typography variant="body2" color="text.secondary">
            Last checked {lastUpdated.toLocaleTimeString()}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}
