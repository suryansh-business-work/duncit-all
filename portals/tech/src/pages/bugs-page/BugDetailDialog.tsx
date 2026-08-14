import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { DetailBlock, DetailField as Field } from '../../components/DetailField';
import { userLabel } from '../../components/telemetry-identity';
import {
  STATUS_OPTIONS,
  affectedSummary,
  statusColor,
  type BugRow,
  type BugStatus,
} from './queries';
import BugOccurrences from './BugOccurrences';

interface Props {
  bug: BugRow | null;
  busy: boolean;
  onClose: () => void;
  onStatus: (bug: BugRow, status: BugStatus) => void;
}

/** `14/08/2026, 10:12:03 · by 66a1…` — when it was resolved and by whom. */
const resolvedLine = (bug: BugRow) => {
  if (!bug.resolved_at) return '';
  const when = new Date(bug.resolved_at).toLocaleString();
  return bug.resolved_by ? `${when} · by ${bug.resolved_by}` : when;
};

/**
 * Who this bug reaches, and the last person it reached.
 *
 * The count is what decides whether it is triaged tonight or on Monday; the
 * named person is who can be asked what they were doing when it happened.
 */
function AffectedSection({ bug }: Readonly<{ bug: BugRow }>) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
      <Field label="Affected" value={affectedSummary(bug)} />
      <Field label="Last user" value={userLabel(bug.last_user)} />
      <Field label="Email" value={bug.last_user?.email ?? ''} />
      <Field label="Phone" value={bug.last_user?.phone ?? ''} />
      <Field label="Roles" value={bug.last_user?.roles?.join(', ') ?? ''} />
      <Field label="User id" value={bug.last_user?.id ?? ''} mono />
      <Field label="App version" value={bug.last_app_version ?? ''} />
      <Field label="Last environment" value={bug.last_environment ?? ''} />
      <Field
        label="Device"
        value={[bug.last_client?.device_model, bug.last_client?.device_os_version]
          .filter(Boolean)
          .join(' · ')}
      />
      <Field
        label="Locale · timezone"
        value={[bug.last_client?.locale, bug.last_client?.timezone].filter(Boolean).join(' · ')}
      />
      <Field label="Network" value={bug.last_client?.network ?? ''} />
      <Field label="IP address" value={bug.last_ip ?? ''} />
      <Field label="Device id" value={bug.last_duid ?? ''} mono />
      <Field label="Session" value={bug.last_session_id ?? ''} mono />
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
  const appLine = [bug.app, bug.portal].filter(Boolean).join(' · ');
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
            <Field label="App" value={appLine} />
            <Field label="First seen" value={new Date(bug.first_seen_at).toLocaleString()} />
            <Field label="Last seen" value={new Date(bug.last_seen_at).toLocaleString()} />
            <Field label="Last URL" value={bug.last_url ?? ''} />
            <Field label="Last host" value={bug.last_host ?? ''} />
            <Field label="Tracked since" value={new Date(bug.created_at).toLocaleString()} />
            <Field label="Resolved" value={resolvedLine(bug)} />
          </Box>

          <Field label="Message" value={bug.message} />
          <Field label="Fingerprint" value={bug.fingerprint} mono />

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

          <Divider />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Who it hits
            </Typography>
            <AffectedSection bug={bug} />
          </Box>

          {bug.last_user_agent ? (
            <DetailBlock label="Latest user agent" value={bug.last_user_agent} />
          ) : null}
          {bug.last_stack ? (
            <DetailBlock label="Latest stack trace" value={bug.last_stack} />
          ) : null}

          <BugOccurrences bugId={bug.id} />
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
