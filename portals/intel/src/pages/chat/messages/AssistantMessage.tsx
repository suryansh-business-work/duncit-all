import { Alert, Box, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { IntelMessage } from '@duncit/gql-types';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import MessageApprovals from '../../../components/approval/MessageApprovals';
import type { LiveTurn } from '../../../components/ChatStream';
import AnswerMarkdown from './AnswerMarkdown';
import Citations from './Citations';
import ToolChips from './ToolChips';

interface Props {
  message: IntelMessage;
  live?: LiveTurn;
  /** Only on the latest answer, and not while one streams. */
  onRegenerate?: () => void;
}

const ERROR_KEYS: Record<string, string> = {
  RESTRICTED: 'intel.chat.errors.RESTRICTED',
  DISABLED: 'intel.chat.errors.DISABLED',
  NOT_CONFIGURED: 'intel.chat.errors.NOT_CONFIGURED',
};

/** An answer: what it did (tools), the text (streaming or stored), its sources and any changes awaiting approval. */
export default function AssistantMessage({ message, live, onRegenerate }: Readonly<Props>) {
  const { t } = useTranslation();
  const streaming = message.status === 'STREAMING';
  const text = streaming ? (live?.text ?? '') : message.content;
  const tools = streaming ? (live?.tools ?? []) : message.tool_calls;
  const copy = () => {
    navigator.clipboard.writeText(message.content).then(
      () => notifySuccess(t('intel.chat.copied')),
      () => notifyError(t('intel.chat.copyFailed'))
    );
  };
  const errorText = message.error_code ? t(ERROR_KEYS[message.error_code] ?? 'intel.chat.errors.generic') : null;

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', '&:hover .intel-msg-actions': { opacity: 1 } }}>
      <Box sx={{ width: 32, height: 32, borderRadius: '50%', bgcolor: 'primary.main', color: 'primary.contrastText', display: 'grid', placeItems: 'center', flexShrink: 0 }} aria-hidden>
        <AutoAwesomeIcon fontSize="small" />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }} aria-live={streaming ? 'polite' : undefined} aria-busy={streaming}>
        <ToolChips items={tools} />
        {text ? <AnswerMarkdown text={text} /> : null}
        {streaming && !text && (
          <Stack spacing={0.75} aria-label={t('intel.chat.thinking')}>
            <Typography variant="caption" color="text.secondary">
              {t('intel.chat.thinking')}
            </Typography>
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="60%" />
          </Stack>
        )}
        {message.status === 'STOPPED' && (
          <Typography variant="caption" color="text.secondary">
            {t('intel.chat.stopped')}
          </Typography>
        )}
        {message.status === 'FAILED' && errorText && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {errorText}
            {message.error_message ? ` (${message.error_message})` : ''}
          </Alert>
        )}
        {!streaming && <Citations items={message.citations} />}
        {!streaming && message.approval_ids.length > 0 && <MessageApprovals ids={message.approval_ids} />}
        {!streaming && (
          <Box className="intel-msg-actions" sx={{ opacity: { xs: 1, md: 0 }, transition: 'opacity .2s', mt: 0.5, display: 'flex', gap: 0.5 }}>
            {message.content && (
              <Tooltip title={t('intel.chat.copy')}>
                <IconButton size="small" aria-label={t('intel.chat.copy')} onClick={copy}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onRegenerate && (
              <Tooltip title={t('intel.chat.regenerate')}>
                <IconButton size="small" aria-label={t('intel.chat.regenerate')} onClick={onRegenerate}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    </Stack>
  );
}
