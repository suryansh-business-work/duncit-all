import { Box, Chip, Link, ListItem, ListItemButton, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StatusDot, { type DotState } from './StatusDot';
import UptimeBarStrip from './UptimeBarStrip';
import { formatUptime } from '../utils/format';
import { stateChipColor, stateLabel } from '../utils/status';
import type { ServiceState, ServiceSummary, StatusService } from '../types';

function dotStateFor(state: ServiceState): DotState {
  if (state === 'nodata') return 'info';
  const chip = stateChipColor(state);
  if (chip === 'success') return 'success';
  if (chip === 'warning') return 'warning';
  return 'error';
}

function UptimeChip({
  windowLabel,
  value,
}: Readonly<{ windowLabel: string; value: number | null | undefined }>) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={`${windowLabel} · ${formatUptime(value)}`}
      sx={{ fontVariantNumeric: 'tabular-nums' }}
    />
  );
}

function ServiceHeading({ service }: Readonly<{ service: StatusService }>) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Typography fontWeight={700} noWrap>
          {service.name}
        </Typography>
        <Link
          href={service.url}
          target="_blank"
          rel="noopener"
          onClick={(event) => event.stopPropagation()}
          sx={{ display: 'inline-flex', color: 'text.secondary' }}
          aria-label={`Open ${service.name} in a new tab`}
        >
          <OpenInNewIcon sx={{ fontSize: 14 }} />
        </Link>
      </Stack>
      <Typography variant="body2" color="text.secondary" noWrap>
        {service.description}
      </Typography>
    </Box>
  );
}

interface ServiceRowProps {
  service: StatusService;
  summary: ServiceSummary | null;
  divider: boolean;
  onSelect: (service: StatusService) => void;
}

export default function ServiceRow({
  service,
  summary,
  divider,
  onSelect,
}: Readonly<ServiceRowProps>) {
  const state: ServiceState = summary?.state ?? 'nodata';
  return (
    <ListItem disablePadding divider={divider}>
      <ListItemButton
        onClick={() => onSelect(service)}
        sx={{ display: 'block', py: 1.5 }}
        aria-label={`Show status and details for ${service.name}`}
      >
        <Stack direction="row" gap={1.5} alignItems="center" flexWrap="wrap">
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: '1 1 220px', minWidth: 0 }}>
            <StatusDot state={dotStateFor(state)} />
            <ServiceHeading service={service} />
          </Stack>
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            <UptimeChip windowLabel="24h" value={summary?.uptime_24h} />
            <UptimeChip windowLabel="90d" value={summary?.uptime_90d} />
            {summary && summary.active_incidents > 0 && (
              <Chip size="small" color="warning" variant="outlined" label={`${summary.active_incidents} active`} />
            )}
            <Chip size="small" color={stateChipColor(state)} label={stateLabel(state)} sx={{ fontWeight: 700 }} />
          </Stack>
        </Stack>
        {summary && summary.daily.length > 0 && (
          <Box mt={1.25}>
            <UptimeBarStrip daily={summary.daily} height={26} />
          </Box>
        )}
      </ListItemButton>
    </ListItem>
  );
}
