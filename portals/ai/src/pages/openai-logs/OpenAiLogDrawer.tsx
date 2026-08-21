import { useQuery } from '@apollo/client';
import { Box, Chip, CircularProgress, Divider, Drawer, IconButton, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import CloseIcon from '@mui/icons-material/Close';
import { usd, tokens } from '../../lib/usd';
import { OPENAI_LOG_ONE, STATUS_COLOR, type OpenAiLogDetail } from './queries';
import { formatDateTime } from '@duncit/app-settings';

interface Props {
  /** The row to open, or null for a closed drawer. */
  logId: string | null;
  onClose: () => void;
}

function Facts({ log }: Readonly<{ log: OpenAiLogDetail }>) {
  const rows: Array<[string, string]> = [
    ['Task', `${log.task_label} (${log.task})`],
    ['Area', log.module || '—'],
    ['Detail', log.detail || '—'],
    ['Model', log.model || '—'],
    ['Tokens', `${tokens(log.total_tokens)} — ${log.prompt_tokens} in, ${log.completion_tokens} out`],
    ['Cost', log.priced || log.total_tokens === 0 ? usd(log.cost_usd) : 'unpriced model'],
    ['Took', `${log.duration_ms} ms`],
    ['HTTP', log.http_status ? String(log.http_status) : 'never sent'],
    ['When', formatDateTime(log.created_at)],
  ];
  return (
    <Stack spacing={0.75}>
      {rows.map(([label, value]) => (
        <Stack key={label} direction="row" spacing={2} justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body2" sx={{ textAlign: 'right', wordBreak: 'break-word' }}>
            {value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function TextBlock({ title, body }: Readonly<{ title: string; body: string }>) {
  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          borderRadius: 1,
          bgcolor: 'action.hover',
          fontSize: 12,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: 320,
          overflow: 'auto',
        }}
      >
        {body || '—'}
      </Box>
    </Box>
  );
}

/**
 * The call as it happened.
 *
 * The prompt shown is the one that was sent, minus the system half — that comes
 * from the Prompt Library and is the same for every call of a task, while the
 * half stored here is what made this call different. Both are truncated at two
 * thousand characters; the point is diagnosing an answer, not archiving it.
 */
export default function OpenAiLogDrawer({ logId, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading } = useQuery<{ openAiUsageLog: OpenAiLogDetail | null }>(OPENAI_LOG_ONE, {
    variables: { id: logId },
    skip: !logId,
    fetchPolicy: 'cache-and-network',
  });
  const log = data?.openAiUsageLog;

  return (
    <Drawer anchor="right" open={!!logId} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 560 } } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2, pb: 1 }}>
        <Typography variant="h6" sx={{ flex: 1 }}>
          OpenAI call
        </Typography>
        {log && <Chip size="small" label={log.status} color={STATUS_COLOR[log.status] ?? 'default'} />}
        <IconButton onClick={onClose} aria-label={t('ai.openAiLogs.close')}>
          <CloseIcon />
        </IconButton>
      </Stack>
      <Divider />
      <Box sx={{ p: 2 }}>
        {loading && !log && <CircularProgress size={24} />}
        {log && (
          <Stack spacing={2.5}>
            <Facts log={log} />
            {log.error_message && (
              <Typography variant="body2" color="error.main">
                {log.error_message}
              </Typography>
            )}
            <TextBlock title={t('ai.openAiLogs.promptSent')} body={log.request_preview} />
            <TextBlock title={t('ai.openAiLogs.answerReturned')} body={log.response_preview} />
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
