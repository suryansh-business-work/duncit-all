import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Alert, Box, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { DuncitButton } from '@duncit/buttons';
import { chatPreviewAction, chatRoomPath, type ChatPreviewKind } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';
import ChatPreviewLine from './ChatPreviewLine';
import { useChatPreview } from './useChatPreview';

interface ChatPreviewCardProps {
  kind: ChatPreviewKind;
  /** The pod's or club's document id. */
  id: string;
  /** A club visitor joins the room by following the club; the card re-reads after. */
  onJoinClub?: () => Promise<void>;
}

/**
 * The chat at the bottom of a pod's or a club's details: everything said in the
 * room, newest at the bottom, readable by anyone signed in. A member opens the
 * room to post; a visitor is told what to do first. App twin:
 * components/chat-preview/ChatPreviewCard.
 */
export default function ChatPreviewCard({ kind, id, onJoinClub }: Readonly<ChatPreviewCardProps>) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const chat = useChatPreview(kind, id);
  const listRef = useRef<HTMLDivElement>(null);
  const titleId = `chat-preview-title-${id}`;

  // Open on the newest line, as a chat does — only when the newest line
  // changes, never when an older page is put above what the reader is looking at.
  const newestId = chat.messages.at(-1)?.id;
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [newestId]);

  const action = chatPreviewAction(kind, !!chat.preview?.is_member);
  const lockedHint = kind === 'POD' ? t('mweb.chat.podChatLocked') : t('mweb.chatRoom.joinToChat');

  let body;
  if (chat.loading) {
    body = <Skeleton variant="rounded" height={160} data-testid="chat-preview-loading" />;
  } else if (chat.error) {
    body = (
      <Alert
        severity="error"
        data-testid="chat-preview-error"
        action={<DuncitButton size="small" onClick={chat.retry}>{t('mweb.chat.previewRetry')}</DuncitButton>}
      >
        {t('mweb.chat.previewFailed')}
      </Alert>
    );
  } else if (chat.messages.length === 0) {
    body = (
      <Typography variant="body2" color="text.secondary" role="status" data-testid="chat-preview-empty">
        {t('mweb.chat.noMessagesYet')}
      </Typography>
    );
  } else {
    body = (
      <Box ref={listRef} role="log" aria-labelledby={titleId} data-testid="chat-preview-list" sx={{ maxHeight: 360, overflowY: 'auto' }}>
        <Stack spacing={1.5}>
          {chat.canLoadEarlier && (
            <DuncitButton
              variant="text"
              size="small"
              loading={chat.loadingEarlier}
              onClick={() => chat.loadEarlier()}
              data-testid="chat-preview-earlier"
              sx={{ alignSelf: 'center' }}
            >
              {t('mweb.chat.showEarlier')}
            </DuncitButton>
          )}
          {chat.earlierFailed && (
            <Typography variant="caption" color="error" role="alert" sx={{ textAlign: 'center' }}>
              {t('mweb.chat.previewFailed')}
            </Typography>
          )}
          {chat.messages.map((m) => (
            <ChatPreviewLine key={m.id} message={m} />
          ))}
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={1.25} component="section" aria-labelledby={titleId} data-testid={`chat-preview-${kind.toLowerCase()}`}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography id={titleId} variant="h6" component="h2">
            {kind === 'POD' ? t('mweb.chat.podChat') : t('mweb.chat.clubChat')}
          </Typography>
          {chat.preview && (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }} data-testid="chat-preview-status">
              <Box aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: chat.preview.closed ? 'text.disabled' : 'primary.main' }} />
              <Typography variant="body2" color={chat.preview.closed ? 'text.secondary' : 'primary'}>
                {chat.preview.closed ? t('mweb.chatRoom.ended') : t('mweb.chat.liveNow')}
              </Typography>
            </Stack>
          )}
        </Box>
        {chat.total > 0 && (
          <Chip color="primary" size="small" data-testid="chat-preview-count" label={t('mweb.chat.messageCount', { count: chat.total })} />
        )}
      </Stack>
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 4 }}>
        <Stack spacing={2}>
          {body}
          {chat.preview && action === 'OPEN' && (
            <DuncitButton
              variant="contained"
              fullWidth
              startIcon={<ChatBubbleOutlineIcon />}
              data-testid="chat-preview-open"
              onClick={() => navigate(chatRoomPath(kind, id))}
            >
              {t('mweb.chat.openChat')}
            </DuncitButton>
          )}
          {chat.preview && action !== 'OPEN' && (
            <Stack spacing={1}>
              <DuncitButton
                variant="contained"
                fullWidth
                startIcon={<LockOutlinedIcon />}
                disabled={action === 'BOOK_POD'}
                aria-describedby={`${titleId}-hint`}
                data-testid="chat-preview-join"
                onClick={
                  onJoinClub &&
                  (async () => {
                    await onJoinClub();
                    await chat.retry();
                  })
                }
              >
                {t('mweb.chat.joinRoom')}
              </DuncitButton>
              <Typography id={`${titleId}-hint`} variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                {lockedHint}
              </Typography>
            </Stack>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
