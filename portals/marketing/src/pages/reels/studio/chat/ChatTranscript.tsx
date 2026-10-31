import { useEffect, useMemo, useRef } from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { ReelAsset, ReelMessage } from '../../types';
import ChatBubble, { type BubbleTone } from './ChatBubble';
import type { PendingTurn } from './useReelChat';

interface Props {
  messages: readonly ReelMessage[];
  assets: readonly ReelAsset[];
  /** The request being worked on right now, if any. */
  pending: PendingTurn | null;
  onRestore: (messageId: string) => Promise<void>;
}

function toneOf(message: ReelMessage): BubbleTone {
  if (message.role === 'USER') return 'operator';
  return message.failed ? 'failed' : 'editor';
}

/** Shown before the first request: what to say, since an empty chat box explains nothing. */
function Intro() {
  const { t } = useTranslation();
  return (
    <Stack spacing={0.5} sx={{ color: 'text.secondary', px: 0.5 }} data-testid="reel-chat-intro">
      <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
        {t('ai.reels.chat.introTitle')}
      </Typography>
      <Typography variant="body2">{t('ai.reels.chat.introBody')}</Typography>
      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
        {t('ai.reels.chat.introExample')}
      </Typography>
    </Stack>
  );
}

/** The conversation so far, newest at the bottom and kept in view. */
export default function ChatTranscript({ messages, assets, pending, onRestore }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatTime } = useDateFormat();
  const endRef = useRef<HTMLDivElement | null>(null);
  const urlById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset.thumbnail_url])), [assets]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, pending]);

  return (
    <Stack spacing={1} sx={{ p: 1.5 }} role="log" aria-live="polite" aria-label={t('ai.reels.chat.transcript')} data-testid="reel-chat-transcript">
      {messages.length === 0 && !pending && <Intro />}
      {messages.map((message) => (
        <ChatBubble
          key={message.id}
          tone={toneOf(message)}
          text={message.failed ? t('ai.reels.chat.failedReply', { vars: { reason: message.text } }) : message.text}
          imageUrls={message.asset_ids.flatMap((id) => urlById.get(id) ?? [])}
          testId={`reel-chat-message-${message.id}`}
          footer={
            <Stack direction="row" sx={{ mt: 0.5, alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
              {message.restorable ? (
                <DuncitButton
                  size="small"
                  startIcon={<RestoreIcon fontSize="small" />}
                  onClick={() => onRestore(message.id)}
                  data-testid={`reel-chat-restore-${message.id}`}
                >
                  {t('ai.reels.chat.restore')}
                </DuncitButton>
              ) : (
                <Box component="span" />
              )}
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {formatTime(message.at)}
              </Typography>
            </Stack>
          }
        />
      ))}
      {pending && (
        <>
          <ChatBubble tone="operator" text={pending.text} imageUrls={pending.imageUrls} testId="reel-chat-pending" />
          <Stack direction="row" role="status" sx={{ alignItems: 'center', gap: 1, color: 'text.secondary', px: 0.5 }} data-testid="reel-chat-working">
            <CircularProgress size={14} aria-hidden />
            <Typography variant="caption">{t('ai.reels.chat.working')}</Typography>
          </Stack>
        </>
      )}
      <Box ref={endRef} />
    </Stack>
  );
}
