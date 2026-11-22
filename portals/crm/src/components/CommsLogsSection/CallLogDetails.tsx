import { Box, Chip, Stack, Tooltip, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { formatTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { TranscriptWave } from './statusVisuals';
import CallSummaryCard from './CallSummaryCard';
import type { CommunicationLogItem } from '../../api/comms.gql';

const transcriptLabelKey = (log: CommunicationLogItem) => {
  if (log.transcript_status === 'PENDING') return 'crm.call.transcriptPending';
  if (log.transcript_status === 'FAILED') return 'crm.call.transcriptFailed';
  if (log.recording_url) return 'crm.call.transcriptNotRequested';
  return 'crm.call.noRecordingYet';
};

interface Props {
  log: CommunicationLogItem;
  onRequestTranscript: (id: string) => void;
  onSummarize: (id: string) => void;
  refreshing?: boolean;
  summarizing?: boolean;
}

/** One call's transcript (by speaker when it was transcribed live), AI summary and recording. */
export default function CallLogDetails({ log, onRequestTranscript, onSummarize, refreshing, summarizing }: Readonly<Props>) {
  const { t } = useTranslation();
  const segments = log.transcript_segments ?? [];
  const transcriptReady = log.transcript_status === 'READY' && !!log.transcript;
  const hasTranscript = transcriptReady || segments.length > 0;

  const transcript = segments.length > 0 ? (
    <Stack component="ol" spacing={0.75} sx={{ listStyle: 'none', m: 0, p: 0, mt: 0.5 }}>
      {segments.map((s) => (
        <Box component="li" key={`${s.speaker}-${s.seq}`}>
          <Typography variant="caption" sx={{ color: s.speaker === 'AGENT' ? 'primary.main' : 'secondary.main', fontWeight: 700 }}>
            {s.speaker === 'AGENT' ? t('crm.call.speakerAgent') : t('crm.call.speakerLead')}
            {s.at ? ` · ${formatTime(new Date(s.at))}` : ''}
          </Typography>
          <Typography variant="body2">{s.text}</Typography>
        </Box>
      ))}
    </Stack>
  ) : (
    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.5 }}>
      {log.transcript}
    </Typography>
  );

  return (
    <Stack spacing={1} sx={{ width: '100%' }}>
      {log.from_number && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('crm.call.fromNumber', { vars: { number: log.from_number } })}
        </Typography>
      )}
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        {hasTranscript ? (
          <Box sx={{ width: '100%' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <TranscriptWave />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('crm.components.transcript')}
              </Typography>
            </Stack>
            {transcript}
          </Box>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Chip size="small" variant="outlined" color={log.transcript_status === 'FAILED' ? 'error' : 'default'} label={t(transcriptLabelKey(log))} />
            {log.recording_url && (
              <DuncitButton size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={() => onRequestTranscript(log.id)} disabled={refreshing}>
                {log.transcript_status === 'FAILED' ? t('crm.call.retryTranscript') : t('crm.call.getTranscript')}
              </DuncitButton>
            )}
          </Stack>
        )}
        {log.recording_url && (
          <Tooltip title={t('crm.components.openRecording')}>
            <DuncitIconButton size="small" component="a" href={log.recording_url} target="_blank" rel="noreferrer" aria-label={t('crm.components.openRecording')}>
              <OpenInNewIcon fontSize="small" />
            </DuncitIconButton>
          </Tooltip>
        )}
      </Stack>
      <CallSummaryCard summary={log.summary} canSummarize={hasTranscript} busy={!!summarizing} onSummarize={() => onSummarize(log.id)} />
    </Stack>
  );
}
