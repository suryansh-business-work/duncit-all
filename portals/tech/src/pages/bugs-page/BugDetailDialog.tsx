import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { STATUS_OPTIONS, statusColor, type BugRow, type BugStatus } from './queries';

interface Props {
  bug: BugRow | null;
  busy: boolean;
  onClose: () => void;
  onStatus: (bug: BugRow, status: BugStatus) => void;
}

function Field({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

export default function BugDetailDialog({ bug, busy, onClose, onStatus }: Readonly<Props>) {
  if (!bug) return null;
  const envRows: Array<[string, number]> = [
    ['Localhost', bug.env_counts.localhost],
    ['Staging', bug.env_counts.staging],
    ['Production', bug.env_counts.production],
  ];
  return (
    <Dialog open={!!bug} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Chip size="small" label={bug.status} color={statusColor(bug.status)} />
          <Typography variant="subtitle1" fontWeight={700} noWrap title={bug.title}>
            {bug.title}
          </Typography>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Field label="Error" value={bug.error_name} />
            <Field label="Occurrences" value={String(bug.occurrence_count)} />
            <Field label="Source" value={bug.source} />
            <Field label="Page" value={bug.page} />
            <Field label="Platform" value={[bug.platform, bug.os].filter(Boolean).join(' · ')} />
            <Field label="App" value={bug.app} />
            <Field label="First seen" value={new Date(bug.first_seen_at).toLocaleString()} />
            <Field label="Last seen" value={new Date(bug.last_seen_at).toLocaleString()} />
            <Field label="Last URL" value={bug.last_url ?? ''} />
            <Field label="Last host" value={bug.last_host ?? ''} />
          </Box>

          <Field label="Message" value={bug.message} />

          <Box>
            <Typography variant="caption" color="text.secondary">
              Occurrences by environment
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
              {envRows.map(([label, count]) => (
                <Chip key={label} size="small" variant="outlined" label={`${label}: ${count}`} />
              ))}
            </Stack>
          </Box>

          {bug.last_stack ? (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Latest stack trace
              </Typography>
              <Paper
                variant="outlined"
                sx={{ mt: 0.5, p: 1.5, maxHeight: 220, overflow: 'auto', bgcolor: 'action.hover' }}
              >
                <Typography
                  component="pre"
                  variant="caption"
                  sx={{ m: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
                >
                  {bug.last_stack}
                </Typography>
              </Paper>
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, flexWrap: 'wrap', gap: 1 }}>
        <Divider flexItem sx={{ display: { xs: 'block', sm: 'none' }, width: '100%' }} />
        {STATUS_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={opt.value === bug.status ? 'contained' : 'outlined'}
            disabled={busy || opt.value === bug.status}
            onClick={() => onStatus(bug, opt.value)}
          >
            Mark {opt.label}
          </Button>
        ))}
        <Box sx={{ flexGrow: 1 }} />
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
