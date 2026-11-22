import { Chip, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import StatusVisual from './statusVisuals';
import CallLogDetails from './CallLogDetails';
import type { CommunicationLogItem } from '../../api/comms.gql';
import { EmailStatusBadge } from '../email-status';
import { formatDateTime } from '@duncit/app-settings';

const fmt = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return formatDateTime(d) || '—';
};

const STATUS_COLOUR: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  SENT: 'success',
  DELIVERED: 'success',
  COMPLETED: 'success',
  INITIATED: 'info',
  IN_PROGRESS: 'info',
  RINGING: 'info',
  QUEUED: 'default',
  FAILED: 'error',
  NO_ANSWER: 'warning',
  BUSY: 'warning',
};

interface Props {
  log: CommunicationLogItem;
  onRequestTranscript: (id: string) => void;
  onSummarize: (id: string) => void;
  refreshing?: boolean;
  /** This log's summary is being generated. */
  summarizing?: boolean;
}

export default function LogRow({ log, onRequestTranscript, onSummarize, refreshing, summarizing }: Readonly<Props>) {
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={(theme) => ({
        p: 1.5,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.02) : 'background.paper',
      })}
    >
      <StatusVisual type={log.type} status={log.status} />
      <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.5}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            alignItems: "center",
            minWidth: 0,
            flexWrap: 'wrap'
          }}>
          <Typography component="p"
            variant="subtitle2"
            noWrap
            sx={{
              fontWeight: 800,
              minWidth: 0
            }}>
            {log.type === 'EMAIL' ? log.subject || '(no subject)' : `Call to ${log.contact_value}`}
          </Typography>
          <Chip size="small" label={log.status} color={STATUS_COLOUR[log.status] ?? 'default'} />
          {log.provider_name && <Chip size="small" variant="outlined" label={log.provider_name} />}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Typography variant="caption" noWrap sx={{
            color: "text.secondary"
          }}>
            {log.contact_name ? `${log.contact_name} · ` : ''}{log.contact_value} · {fmt(log.created_at)}
          </Typography>
          {log.type === 'EMAIL' && <EmailStatusBadge email={log.contact_value} />}
        </Stack>
        {log.error_message && (
          <Typography variant="caption" sx={{
            color: "error.main"
          }}>
            {log.error_message}
          </Typography>
        )}
        {log.type === 'CALL' && (
          <CallLogDetails
            log={log}
            onRequestTranscript={onRequestTranscript}
            onSummarize={onSummarize}
            refreshing={refreshing}
            summarizing={summarizing}
          />
        )}
      </Stack>
    </Stack>
  );
}
