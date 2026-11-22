import { memo } from 'react';
import { Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined';
import VolumeUpOutlinedIcon from '@mui/icons-material/VolumeUpOutlined';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { DuncitIconButton } from '@duncit/buttons';
import { errorKey, toolStatusKey } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import ActionCard from './ActionCard';
import MarkdownView from './MarkdownView';
import type { Message } from './queries';

interface Props {
  message: Message;
  canRollback: boolean;
  voice: boolean;
  speaking: boolean;
  onDecide: (actionId: string, approve: boolean) => void;
  onRollback: (actionId: string) => void;
  onRate: (messageId: string, rating: 'UP' | 'DOWN') => void;
  onSpeak: (messageId: string, text: string) => void;
}

/** Tools the assistant ran for this answer, as small status chips. */
function ToolSteps({ calls }: Readonly<{ calls: Message['tool_calls'] }>) {
  const { t } = useTranslation();
  const shown = calls.filter((c) => !['find_tools', 'describe_tool', 'flag_out_of_context'].includes(c.name));
  if (!shown.length) return null;
  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
      {shown.map((call, i) => (
        <Chip
          key={`${call.name}-${i}`}
          size="small"
          variant="outlined"
          icon={call.status === 'RUNNING' ? <CircularProgress size={12} /> : undefined}
          label={`${call.title} · ${t(toolStatusKey(call.status))}`}
        />
      ))}
    </Stack>
  );
}

function AssistantBody({ message }: Readonly<{ message: Message }>) {
  const { t } = useTranslation();
  const streaming = message.status === 'STREAMING';
  if (message.content) return <MarkdownView text={message.content} />;
  if (streaming) {
    return (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} aria-live="polite">
        <CircularProgress size={14} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('askDuncit.thinking')}
        </Typography>
      </Stack>
    );
  }
  return null;
}

function MessageBubble({ message, canRollback, voice, speaking, onDecide, onRollback, onRate, onSpeak }: Readonly<Props>) {
  const { t } = useTranslation();
  const mine = message.role === 'user';
  const done = message.status === 'COMPLETE' || message.status === 'STOPPED';
  const failed = message.status === 'FAILED' || Boolean(message.error_code);
  return (
    <Stack sx={{ alignItems: mine ? 'flex-end' : 'flex-start' }} data-testid={`ask-duncit-message-${message.role}`}>
      <Box
        sx={{
          maxWidth: '88%',
          px: 1.75,
          py: 1.25,
          borderRadius: 2.5,
          bgcolor: mine ? 'primary.main' : 'background.paper',
          color: mine ? 'primary.contrastText' : 'text.primary',
          border: mine ? 0 : 1,
          borderColor: 'divider',
        }}
      >
        {mine ? (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {message.content}
          </Typography>
        ) : (
          <>
            <ToolSteps calls={message.tool_calls} />
            <AssistantBody message={message} />
          </>
        )}
        {message.attachments.map((file) => (
          <Chip key={file.url} size="small" icon={<AttachFileIcon />} label={file.name} sx={{ mt: 0.75, mr: 0.5 }} />
        ))}
        {failed && !mine && (
          <Typography variant="body2" role="alert" sx={{ color: 'error.main', mt: message.content ? 1 : 0 }}>
            {t(errorKey(message.error_code))}
          </Typography>
        )}
        {message.status === 'STOPPED' && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
            {t('askDuncit.stopped')}
          </Typography>
        )}
      </Box>
      {message.actions.map((action) => (
        <Box key={action.id} sx={{ mt: 1, width: '88%' }}>
          <ActionCard action={action} canRollback={canRollback} onDecide={onDecide} onRollback={onRollback} />
        </Box>
      ))}
      {!mine && done && message.content && (
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, alignItems: 'center' }}>
          <DuncitIconButton size="small" aria-label={t('askDuncit.feedback.up')} aria-pressed={message.feedback_rating === 'UP'} color={message.feedback_rating === 'UP' ? 'primary' : 'default'} onClick={() => onRate(message.id, 'UP')}>
            <ThumbUpAltOutlinedIcon fontSize="small" />
          </DuncitIconButton>
          <DuncitIconButton size="small" aria-label={t('askDuncit.feedback.down')} aria-pressed={message.feedback_rating === 'DOWN'} color={message.feedback_rating === 'DOWN' ? 'primary' : 'default'} onClick={() => onRate(message.id, 'DOWN')}>
            <ThumbDownAltOutlinedIcon fontSize="small" />
          </DuncitIconButton>
          {voice && (
            <DuncitIconButton size="small" aria-label={t(speaking ? 'askDuncit.voice.stopReading' : 'askDuncit.voice.readAloud')} onClick={() => onSpeak(message.id, message.content)}>
              {speaking ? <StopCircleOutlinedIcon fontSize="small" /> : <VolumeUpOutlinedIcon fontSize="small" />}
            </DuncitIconButton>
          )}
          {message.low_confidence && (
            <Typography variant="caption" sx={{ color: 'warning.main' }}>
              {t('askDuncit.lowConfidence')}
            </Typography>
          )}
        </Stack>
      )}
      {!mine && message.knowledge_refs?.length ? (
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.25 }}>
          {t('askDuncit.sources')}: {message.knowledge_refs.map((ref) => ref.title).join(' · ')}
        </Typography>
      ) : null}
    </Stack>
  );
}

export default memo(MessageBubble);
