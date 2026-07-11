import { Paper, Stack, Typography } from '@mui/material';
import StatusDot, { type DotState } from './StatusDot';
import type { ServiceGroup, SummaryResponse } from '../types';

export interface OverallStatus {
  severity: DotState;
  message: string;
}

/** Pure state derivation, exported for unit tests. */
export function deriveOverallStatus(
  groups: ServiceGroup[] | null,
  summary: SummaryResponse | null,
): OverallStatus {
  if (!groups || !summary) return { severity: 'info', message: 'Checking services…' };
  const services = groups.flatMap((group) => group.items);
  const total = services.length;
  const latests = services
    .map((service) => summary.services[service.key]?.latest)
    .filter((latest) => latest !== null && latest !== undefined);
  if (latests.length === 0) {
    return { severity: 'info', message: 'Awaiting the first checks — probes run every 5 minutes.' };
  }
  const up = latests.filter((latest) => latest.ok).length;
  if (up === total) return { severity: 'success', message: 'All systems operational' };
  if (up === 0) return { severity: 'error', message: `0 of ${total} services operational` };
  return { severity: 'warning', message: `${up} of ${total} services operational` };
}

interface BannerProps {
  groups: ServiceGroup[] | null;
  summary: SummaryResponse | null;
  lastUpdated: Date | null;
}

export default function OverallStatusBanner({
  groups,
  summary,
  lastUpdated,
}: Readonly<BannerProps>) {
  const status = deriveOverallStatus(groups, summary);
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
