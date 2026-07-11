import {
  Box,
  Chip,
  Link,
  ListItem,
  ListItemButton,
  Stack,
  Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import StatusDot, { type DotState } from './StatusDot';
import { formatUptime } from '../utils/format';
import type { LatestCheck, ServiceSummary, StatusService } from '../types';

type ChipColor = 'success' | 'error' | 'default';

interface RowStatus {
  state: DotState;
  label: string;
  color: ChipColor;
}

function statusOf(latest: LatestCheck | null | undefined): RowStatus {
  if (!latest) return { state: 'info', label: 'No data', color: 'default' };
  if (latest.ok) return { state: 'success', label: 'Operational', color: 'success' };
  return { state: 'error', label: 'Down', color: 'error' };
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
  const status = statusOf(summary?.latest);
  return (
    <ListItem disablePadding divider={divider}>
      <ListItemButton
        onClick={() => onSelect(service)}
        sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, py: 1.5 }}
        aria-label={`Show status and details for ${service.name}`}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: '1 1 240px', minWidth: 0 }}>
          <StatusDot state={status.state} />
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
        </Stack>
        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
          <UptimeChip windowLabel="24h" value={summary?.uptime_24h} />
          <UptimeChip windowLabel="7d" value={summary?.uptime_7d} />
          <UptimeChip windowLabel="90d" value={summary?.uptime_90d} />
          <Chip size="small" color={status.color} label={status.label} sx={{ fontWeight: 700 }} />
        </Stack>
      </ListItemButton>
    </ListItem>
  );
}
