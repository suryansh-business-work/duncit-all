import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { formatDate } from '../utils/format';
import { stateChipColor, stateLabel } from '../utils/status';
import type { Incident, IncidentImpact } from '../types';

const IMPACT_LABEL: Record<IncidentImpact, string> = {
  degraded: 'Degraded',
  partial_outage: 'Partial outage',
  major_outage: 'Major outage',
};

function IncidentRow({ incident, divider }: Readonly<{ incident: Incident; divider: boolean }>) {
  const resolved = incident.resolved_at !== null;
  const range = resolved
    ? `${formatDate(incident.started_at)} — ${formatDate(incident.resolved_at)}`
    : `Since ${formatDate(incident.started_at)}`;
  return (
    <Box sx={{ py: 1.75, ...(divider ? { borderBottom: 1, borderColor: 'divider' } : {}) }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip size="small" color={stateChipColor(incident.impact)} label={IMPACT_LABEL[incident.impact]} />
        <Typography fontWeight={700}>{incident.title}</Typography>
        <Chip size="small" variant="outlined" label={incident.service_name} />
        <Chip
          size="small"
          variant="outlined"
          color={resolved ? 'success' : 'warning'}
          label={resolved ? 'Resolved' : stateLabel('degraded')}
          sx={{ ml: 'auto' }}
        />
      </Stack>
      {incident.body && (
        <Typography variant="body2" color="text.secondary" mt={0.5}>
          {incident.body}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary">
        {range}
      </Typography>
    </Box>
  );
}

export default function IncidentsSection({ incidents }: Readonly<{ incidents: Incident[] | null }>) {
  if (incidents === null) return null;
  return (
    <Box component="section" mb={4}>
      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ letterSpacing: '0.12em', fontWeight: 700 }}
      >
        Past incidents — last 90 days
      </Typography>
      <Paper variant="outlined" sx={{ mt: 0.5, px: 2.5, py: incidents.length ? 0.5 : 2.5 }}>
        {incidents.length === 0 ? (
          <Stack direction="row" spacing={1} alignItems="center" color="text.secondary">
            <CheckCircleOutlineIcon fontSize="small" color="success" />
            <Typography variant="body2">No incidents reported in the last 90 days.</Typography>
          </Stack>
        ) : (
          incidents.map((incident, index) => (
            <IncidentRow
              key={incident.id}
              incident={incident}
              divider={index < incidents.length - 1}
            />
          ))
        )}
      </Paper>
    </Box>
  );
}
