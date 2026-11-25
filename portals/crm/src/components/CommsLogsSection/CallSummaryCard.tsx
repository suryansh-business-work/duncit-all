import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import RefreshIcon from '@mui/icons-material/Refresh';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { CRM_CALL_SENTIMENT } from '@duncit/utils';
import type { CallLogSummary } from '../../api/comms.gql';


interface Props {
  summary: CallLogSummary | null | undefined;
  /** A transcript exists, so a summary can be generated. */
  canSummarize: boolean;
  busy: boolean;
  onSummarize: () => void;
}

function Points({ title, items }: Readonly<{ title: string; items: string[] }>) {
  if (items.length === 0) return null;
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {title}
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {items.map((item) => (
          <Typography component="li" variant="body2" key={item}>
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

/**
 * The AI read of a call: summary, sentiment, outcome, key points and
 * follow-ups, with whether a follow-up reminder was created. Generate (or
 * Retry after a failure) runs it on demand.
 */
export default function CallSummaryCard({ summary, canSummarize, busy, onSummarize }: Readonly<Props>) {
  const { t } = useTranslation();
  const status = summary?.status ?? 'NONE';

  if (status === 'PENDING' || busy) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} role="status">
        <CircularProgress size={14} aria-hidden />
        <Typography variant="caption">{t('crm.call.summaryPending')}</Typography>
      </Stack>
    );
  }

  if (status !== 'READY' || !summary) {
    if (!canSummarize) return null;
    const failed = status === 'FAILED';
    return (
      <Stack spacing={1}>
        {failed && (
          <Alert severity="warning" sx={{ py: 0 }}>
            {t('crm.call.summaryFailed')}
            {summary?.error ? ` · ${summary.error}` : ''}
          </Alert>
        )}
        <Box>
          <DuncitButton size="small" variant="outlined" startIcon={failed ? <RefreshIcon /> : <AutoAwesomeIcon />} onClick={onSummarize}>
            {failed ? t('crm.call.retrySummary') : t('crm.call.generateSummary')}
          </DuncitButton>
        </Box>
      </Stack>
    );
  }

  const sentiment = summary.sentiment ? CRM_CALL_SENTIMENT[summary.sentiment] : null;
  return (
    <Stack spacing={1} data-testid="call-summary" sx={{ p: 1.25, borderRadius: 1, bgcolor: 'action.hover' }}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <AutoAwesomeIcon fontSize="small" color="primary" aria-hidden />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1 }}>
          {t('crm.call.summaryTitle')}
        </Typography>
        {sentiment && <Chip size="small" color={sentiment.tone} label={t(sentiment.labelKey)} />}
        {summary.reminder_id && <Chip size="small" variant="outlined" icon={<EventAvailableIcon />} label={t('crm.call.reminderCreated')} />}
      </Stack>
      <Typography variant="body2">{summary.text}</Typography>
      {summary.outcome && (
        <Typography variant="body2">
          <strong>{t('crm.call.outcome')}:</strong> {summary.outcome}
        </Typography>
      )}
      <Points title={t('crm.call.keyPoints')} items={summary.key_points} />
      <Points title={t('crm.call.followUps')} items={summary.follow_ups} />
      <Box>
        <DuncitButton size="small" startIcon={<RefreshIcon />} onClick={onSummarize}>
          {t('crm.call.retrySummary')}
        </DuncitButton>
      </Box>
    </Stack>
  );
}
