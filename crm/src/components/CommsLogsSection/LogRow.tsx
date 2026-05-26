import { Box, Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { format } from 'date-fns';
import StatusVisual, { TranscriptWave } from './statusVisuals';
import type { CommunicationLogItem } from '../../api/comms.gql';

const fmt = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy, hh:mm a');
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
  refreshing?: boolean;
}

export default function LogRow({ log, onRequestTranscript, refreshing }: Props) {
  const transcriptReady = log.transcript_status === 'READY' && log.transcript;
  return (
    <Stack
      direction="row"
      spacing={1.5}
      sx={(theme) => ({
        p: 1.5,
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'background.paper',
      })}
    >
      <StatusVisual type={log.type} status={log.status} />
      <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.5}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flexWrap: 'wrap' }} useFlexGap>
          <Typography variant="subtitle2" fontWeight={800} noWrap sx={{ minWidth: 0 }}>
            {log.type === 'EMAIL' ? log.subject || '(no subject)' : `Call to ${log.contact_value}`}
          </Typography>
          <Chip size="small" label={log.status} color={STATUS_COLOUR[log.status] ?? 'default'} />
          {log.provider_name && <Chip size="small" variant="outlined" label={log.provider_name} />}
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap>
          {log.contact_name ? `${log.contact_name} · ` : ''}{log.contact_value} · {fmt(log.created_at)}
        </Typography>
        {log.error_message && (
          <Typography variant="caption" color="error.main">
            {log.error_message}
          </Typography>
        )}
        {log.type === 'CALL' && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {transcriptReady ? (
              <Box sx={{ width: '100%' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TranscriptWave />
                  <Typography variant="caption" color="text.secondary">Transcript</Typography>
                </Stack>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
                  {log.transcript}
                </Typography>
              </Box>
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  size="small"
                  variant="outlined"
                  color={log.transcript_status === 'FAILED' ? 'error' : 'default'}
                  label={
                    log.transcript_status === 'PENDING'
                      ? 'Transcript pending'
                      : log.transcript_status === 'FAILED'
                        ? 'Transcript failed'
                        : log.recording_url
                          ? 'Transcript not requested'
                          : 'No recording yet'
                  }
                />
                {log.recording_url && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => onRequestTranscript(log.id)}
                    disabled={refreshing}
                  >
                    {log.transcript_status === 'FAILED' ? 'Retry transcript' : 'Get transcript'}
                  </Button>
                )}
              </Stack>
            )}
            {log.recording_url && (
              <Tooltip title="Open recording">
                <IconButton size="small" component="a" href={log.recording_url} target="_blank" rel="noreferrer">
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
