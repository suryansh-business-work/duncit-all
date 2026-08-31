import { useQuery } from '@apollo/client/react';
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
import { ENV_COLOR, userLabel } from '../../components/telemetry-identity';
import { BUG_OCCURRENCES, type BugOccurrence } from './queries';
import { formatDateTime, useTranslation } from '@duncit/app-settings';

function Mono({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
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

/** `Priya Sharma · priya@… · +91… · v1.59.2 · Chrome on Android` — one line. */
function occurrenceWho(occ: BugOccurrence): string {
  const parts = [userLabel(occ.user)];
  if (occ.user?.email && occ.user.email !== occ.user.name) parts.push(occ.user.email);
  if (occ.user?.phone) parts.push(occ.user.phone);
  if (occ.client?.app_version) parts.push(`v${occ.client.app_version}`);
  const device = [occ.client?.device_model, occ.client?.device_os_version].filter(Boolean).join(' ');
  if (device) parts.push(device);
  if (occ.client?.network) parts.push(occ.client.network);
  if (occ.ip) parts.push(occ.ip);
  return parts.join(' · ');
}

function OccurrenceItem({ occ }: Readonly<{ occ: BugOccurrence }>) {
  const { t } = useTranslation();
  return (
    <Accordion variant="outlined" disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            minWidth: 0,
            flex: 1
          }}>
          <Chip size="small" label={occ.environment} color={ENV_COLOR[occ.environment] ?? 'default'} />
          <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>
            {formatDateTime(occ.created_at)}
          </Typography>
          <Typography variant="body2" noWrap title={occ.component} sx={{
            color: "text.secondary"
          }}>
            {occ.component}
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              whiteSpace: 'nowrap'
            }}>
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
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              wordBreak: 'break-word'
            }}>
            {occurrenceWho(occ)}
          </Typography>
          {occ.url ? (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                wordBreak: 'break-all'
              }}>
              {occ.url}
              {occ.host ? ` · ${occ.host}` : ''}
            </Typography>
          ) : null}
          {occ.error?.stack ? <Mono label={t('tech.common.stackTrace')} value={occ.error.stack} /> : null}
          {occ.data_json ? <Mono label={t('tech.bugs.extraData')} value={occ.data_json} /> : null}
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
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        Recent occurrences{rows.length > 0 ? ` (${rows.length})` : ''}
      </Typography>
      {loading && rows.length === 0 ? (
        <Stack
          sx={{
            alignItems: "center",
            py: 2
          }}>
          <CircularProgress size={22} />
        </Stack>
      ) : null}
      {error ? <Alert severity="error">{error.message}</Alert> : null}
      {!loading && !error && rows.length === 0 ? (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 0.5
          }}>
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
