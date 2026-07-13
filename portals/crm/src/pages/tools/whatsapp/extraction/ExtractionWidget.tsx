import { useState } from 'react';
import {
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tooltip,
  Typography,
  keyframes,
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useExtraction } from './ExtractionContext';
import type { WaExtraction } from '../whatsappQueries';

const spin = keyframes`from { transform: rotate(0deg); } to { transform: rotate(360deg); }`;

const STATUS_COLOR = { RUNNING: 'warning', DONE: 'success', FAILED: 'error', CANCELLED: 'default' } as const;
const STATUS_TITLE = {
  RUNNING: 'Extracting data…',
  DONE: 'Extraction finished',
  FAILED: 'Extraction failed',
  CANCELLED: 'Extraction cancelled',
} as const;

function barColorFor(status: WaExtraction['status']): 'warning' | 'success' | 'error' | 'inherit' {
  if (status === 'RUNNING') return 'warning';
  if (status === 'DONE') return 'success';
  if (status === 'FAILED') return 'error';
  return 'inherit';
}

/** Collapsed state — a floating status chip that reopens the widget. */
function MinimizedChip({ job, pct, onOpen }: Readonly<{ job: WaExtraction; pct: number; onOpen: () => void }>) {
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

function ProgressSection({ job, running, pct }: Readonly<{ job: WaExtraction; running: boolean; pct: number }>) {
  return (
    <Box sx={{ px: 1.5 }}>
      {running && job.total === 0 ? (
        <LinearProgress sx={{ borderRadius: 1 }} />
      ) : (
        <LinearProgress variant="determinate" value={running ? pct : 100} color={barColorFor(job.status)} sx={{ borderRadius: 1 }} />
      )}
      <Typography variant="caption" color="text.secondary">
        {running ? `${job.processed} / ${job.total || '…'} contacts (${pct}%)` : `${job.processed} contacts processed`}
      </Typography>
    </Box>
  );
}

function StatRow({ job }: Readonly<{ job: WaExtraction }>) {
  const stats: [string, number, string][] = [
    ['Valid', job.valid, 'success.main'],
    ['Invalid', job.invalid, 'error.main'],
    ['Duplicates', job.duplicates, 'warning.main'],
    ['New leads', job.leads_created, 'primary.main'],
  ];
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.75}>
      {stats.map(([label, value, color]) => (
        <Chip key={label} size="small" variant="outlined" label={`${label}: ${value}`} sx={{ color, borderColor: color }} />
      ))}
    </Stack>
  );
}

function StatsDialog({ job, open, onClose }: Readonly<{ job: WaExtraction; open: boolean; onClose: () => void }>) {
  const rows: [string, number | string][] = [
    ['Status', job.status],
    ['Communities', job.communities],
    ['Groups', job.groups],
    ['Contacts processed', `${job.processed} / ${job.total}`],
    ['Valid numbers', job.valid],
    ['Invalid / skipped', job.invalid],
    ['Duplicates (already saved)', job.duplicates],
    ['New leads created', job.leads_created],
  ];
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Extraction summary</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          {rows.map(([label, value]) => (
            <Stack key={label} direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="body2" fontWeight={700}>{value}</Typography>
            </Stack>
          ))}
          {job.error && <Typography variant="body2" color="error">{job.error}</Typography>}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

/** Global, minimizable extraction progress widget (bottom-right). */
export default function ExtractionWidget() {
  const { job, open, setOpen, cancel } = useExtraction();
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const [details, setDetails] = useState(false);

  if (!job || job.id === hiddenId) return null;
  const running = job.status === 'RUNNING';
  const pct = job.total > 0 ? Math.round((job.processed / job.total) * 100) : 0;
  const title = STATUS_TITLE[job.status];

  if (!open) {
    return <MinimizedChip job={job} pct={pct} onOpen={() => setOpen(true)} />;
  }

  return (
    <Paper
      elevation={8}
      sx={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1300, width: 320, borderRadius: 3, overflow: 'hidden' }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1.5, pb: 1 }}>
        {running ? (
          <SyncIcon color="warning" sx={{ animation: `${spin} 1.2s linear infinite` }} />
        ) : (
          <SyncIcon color={job.status === 'FAILED' ? 'error' : 'success'} />
        )}
        <Typography fontWeight={800} sx={{ flex: 1 }} noWrap>
          {title}
        </Typography>
        <Tooltip title="Details">
          <IconButton size="small" onClick={() => setDetails(true)}><InfoOutlinedIcon fontSize="small" /></IconButton>
        </Tooltip>
        <Tooltip title="Minimize">
          <IconButton size="small" onClick={() => setOpen(false)}><MinimizeIcon fontSize="small" /></IconButton>
        </Tooltip>
        <Tooltip title={running ? 'Cancel extraction' : 'Dismiss'}>
          <IconButton
            size="small"
            color={running ? 'error' : 'default'}
            onClick={() => {
              if (running) cancel().catch(console.error);
              else setHiddenId(job.id);
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      <ProgressSection job={job} running={running} pct={pct} />

      <Box sx={{ p: 1.5, pt: 1 }}>
        {job.status === 'FAILED' ? (
          <Typography variant="body2" color="error">{job.error || 'Extraction failed.'}</Typography>
        ) : (
          <StatRow job={job} />
        )}
      </Box>

      <StatsDialog job={job} open={details} onClose={() => setDetails(false)} />
    </Paper>
  );
}
