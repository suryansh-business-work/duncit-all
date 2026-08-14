import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { parseIssueData, type ErrorLogRow } from './queries';

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

function Mono({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
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
          {value}
        </Typography>
      </Paper>
    </Box>
  );
}

/** Everything one captured server-operation failure knows about itself. */
export default function ErrorLogDetailDialog({
  row,
  onClose,
}: Readonly<{ row: ErrorLogRow | null; onClose: () => void }>) {
  if (!row) return null;
  const issue = parseIssueData(row);
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{issue.operation ?? row.error?.name ?? 'Server error'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Field label="When" value={new Date(row.created_at).toLocaleString()} />
            <Field label="Environment" value={row.environment} />
            <Field label="Source" value={row.source} />
            <Field label="Page" value={row.page} />
            <Field label="Platform" value={[row.platform, row.os].filter(Boolean).join(' · ')} />
            <Field label="Kind" value={issue.kind ?? ''} />
            <Field label="GraphQL code" value={issue.code ?? ''} />
            <Field label="Operation" value={issue.operation ?? ''} />
            <Field label="GraphQL path" value={issue.gql_path ?? ''} />
            <Field label="URL" value={row.url ?? ''} />
          </Box>
          <Field label="Message" value={row.error?.message ?? ''} />
          {row.error?.stack ? <Mono label="Stack trace" value={row.error.stack} /> : null}
          {row.data_json ? <Mono label="Structured data" value={row.data_json} /> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
