import { useQuery } from '@apollo/client';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { BUG_OCCURRENCES, type BugOccurrence } from './queries';

const ENV_COLOR: Record<string, 'error' | 'warning' | 'default'> = {
  production: 'error',
  staging: 'warning',
  localhost: 'default',
};

function Mono({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        component="pre"
        variant="caption"
        sx={{
          m: 0,
          p: 1,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'monospace',
          bgcolor: 'action.hover',
          borderRadius: 1,
          maxHeight: 200,
          overflow: 'auto',
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function OccurrenceItem({ occ }: Readonly<{ occ: BugOccurrence }>) {
  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
          <Chip size="small" label={occ.environment} color={ENV_COLOR[occ.environment] ?? 'default'} />
          <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
            {new Date(occ.created_at).toLocaleString()}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap title={occ.component}>
            {occ.component}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
            {[occ.platform, occ.os].filter(Boolean).join(' · ')}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={1.5}>
          {occ.error ? (
            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
              <strong>{occ.error.name}:</strong> {occ.error.message}
            </Typography>
          ) : null}
          {occ.url ? (
            <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
              {occ.url}
              {occ.host ? ` · ${occ.host}` : ''}
            </Typography>
          ) : null}
          {occ.error?.stack ? <Mono label="Stack trace" value={occ.error.stack} /> : null}
          {occ.data_json ? <Mono label="Extra data" value={occ.data_json} /> : null}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}

/**
 * The recent persisted error logs behind this bug — each occurrence with its
 * own environment, component, URL, stack and attached data. Only occurrences
 * still inside the log retention window can appear, so the list can be shorter
 * than the bug's lifetime count.
 */
export default function BugOccurrences({ bugId }: Readonly<{ bugId: string }>) {
  const { data, loading, error } = useQuery<{ bugOccurrences: BugOccurrence[] }>(BUG_OCCURRENCES, {
    variables: { bug_id: bugId, limit: 20 },
    fetchPolicy: 'cache-and-network',
  });
  const rows = data?.bugOccurrences ?? [];

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        Recent occurrences{rows.length > 0 ? ` (${rows.length})` : ''}
      </Typography>
      {loading && rows.length === 0 ? (
        <Stack alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={22} />
        </Stack>
      ) : null}
      {error ? <Alert severity="error">{error.message}</Alert> : null}
      {!loading && !error && rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          No persisted occurrences inside the retention window — only the roll-up above remains.
        </Typography>
      ) : null}
      <Stack spacing={0.5} sx={{ mt: 0.5 }}>
        {rows.map((occ) => (
          <OccurrenceItem key={occ.id} occ={occ} />
        ))}
      </Stack>
    </Box>
  );
}
