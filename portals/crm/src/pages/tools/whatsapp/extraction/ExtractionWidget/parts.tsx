import { Box, Chip, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import type { WaExtraction } from '../../whatsappQueries';
import { STATUS_COLOR, STATUS_TITLE, barColorFor, spin } from './status';

/** Collapsed state — a floating status chip that reopens the widget. */
export function MinimizedChip({ job, pct, onOpen }: Readonly<{ job: WaExtraction; pct: number; onOpen: () => void }>) {
  const running = job.status === 'RUNNING';
  const title = STATUS_TITLE[job.status];
  return (
    <Tooltip title={running ? `Extracting… ${pct}%` : title}>
      <Chip
        icon={
          running ? (
            <SyncIcon sx={{ animation: `${spin} 1.2s linear infinite` }} />
          ) : (
            <InfoOutlinedIcon />
          )
        }
        color={STATUS_COLOR[job.status]}
        label={running ? `Extracting ${pct}%` : title}
        onClick={onOpen}
        sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1300, boxShadow: 4, cursor: 'pointer' }}
      />
    </Tooltip>
  );
}

export function ProgressSection({ job, running, pct }: Readonly<{ job: WaExtraction; running: boolean; pct: number }>) {
  return (
    <Box sx={{ px: 1.5 }}>
      {running && job.total === 0 ? (
        <LinearProgress sx={{ borderRadius: 1 }} />
      ) : (
        <LinearProgress variant="determinate" value={running ? pct : 100} color={barColorFor(job.status)} sx={{ borderRadius: 1 }} />
      )}
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        {running ? `${job.processed} / ${job.total || '…'} contacts (${pct}%)` : `${job.processed} contacts processed`}
      </Typography>
    </Box>
  );
}

export function StatRow({ job }: Readonly<{ job: WaExtraction }>) {
  const stats: [string, number, string][] = [
    ['Valid', job.valid, 'success.main'],
    ['Invalid', job.invalid, 'error.main'],
    ['Duplicates', job.duplicates, 'warning.main'],
    ['New leads', job.leads_created, 'primary.main'],
  ];
  return (
    <Stack
      direction="row"
      sx={{
        flexWrap: "wrap",
        gap: 0.75
      }}>
      {stats.map(([label, value, color]) => (
        <Chip key={label} size="small" variant="outlined" label={`${label}: ${value}`} sx={{ color, borderColor: color }} />
      ))}
    </Stack>
  );
}
